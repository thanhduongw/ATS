package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.interview.client.dto.CandidateSummaryResponse;
import iuh.fit.se.interview.client.dto.UserSummaryResponse;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.InterviewEvaluation;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.*;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewerSummary;
import iuh.fit.se.interview.scheduling.dto.InterviewSlotResponse;
import iuh.fit.se.interview.scheduling.dto.SlotBatchCreateRequest;
import iuh.fit.se.interview.scheduling.dto.SlotConfirmRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewSlotService {

    private final InterviewSlotRepository slotRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final AuthServiceClient authServiceClient;
    private final InterviewEventPublisher eventPublisher;

    @Transactional
    public List<InterviewSlotResponse> createBatch(
            Long tenantId, Long actorUserId, String role, SlotBatchCreateRequest req) {

        AccessGuard.requireHr(role);

        ApplicationSummaryResponse application = fetchApplication(tenantId, req.applicationId());
        if ("REJECTED".equals(application.currentStageType()) || "HIRED".equals(application.currentStageType())) {
            throw new BusinessException("Không thể tạo khung giờ cho hồ sơ đã kết thúc");
        }

        List<InterviewSlot> slotsToSave = req.slots().stream()
                .map(s -> InterviewSlot.builder()
                        .tenantId(tenantId)
                        .applicationId(req.applicationId())
                        .candidateNameSnapshot(application.candidateName())
                        .startTime(s.startTime())
                        .endTime(s.endTime())
                        .format(req.format())
                        .location(req.location())
                        .meetingLink(req.meetingLink())
                        .status(InterviewSlotStatus.PROPOSED)
                        .departmentConfirmed(false)
                        .candidateConfirmed(false)
                        .matched(false)
                        .build())
                .toList();

        List<InterviewSlot> saved = slotRepository.saveAll(slotsToSave);
        return saved.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<InterviewSlotResponse> getSlots(Long tenantId, Long applicationId) {
        return slotRepository.findByTenantIdAndApplicationIdOrderByStartTimeAsc(tenantId, applicationId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InterviewSlotResponse> getMyPendingSlots(Long tenantId, Long userId, String role) {
        List<InterviewSlot> proposed = slotRepository.findByTenantIdAndStatusOrderByStartTimeAsc(
                tenantId, InterviewSlotStatus.PROPOSED);

        if (AccessGuard.isCandidate(role)) {
            Long candidateId = resolveCandidateId(tenantId, userId);
            return proposed.stream()
                    .filter(s -> {
                        try {
                            ApplicationSummaryResponse app = fetchApplication(tenantId, s.getApplicationId());
                            return candidateId.equals(app.candidateId()) && !s.isCandidateConfirmed();
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .map(this::toResponse)
                    .toList();
        }

        if (AccessGuard.isDepartment(role)) {
            return proposed.stream()
                    .filter(s -> !s.isDepartmentConfirmed())
                    .map(this::toResponse)
                    .toList();
        }

        return proposed.stream().map(this::toResponse).toList();
    }

    @Transactional
    public InterviewSlotResponse confirmSlot(
            Long tenantId, Long userId, String role, Long slotId, SlotConfirmRequest req) {

        InterviewSlot slot = slotRepository.findByIdAndTenantId(slotId, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khung giờ"));

        if (slot.getStatus() != InterviewSlotStatus.PROPOSED) {
            throw new BusinessException("Chỉ xác nhận được khung giờ đang đề xuất");
        }

        if (AccessGuard.isCandidate(role)) {
            slot.setCandidateConfirmed(req.available());
        } else if (AccessGuard.isDepartment(role)) {
            slot.setDepartmentConfirmed(req.available());
        } else if (AccessGuard.isHr(role)) {
            slot.setDepartmentConfirmed(req.available());
            slot.setCandidateConfirmed(req.available());
        }

        slot.setMatched(slot.isDepartmentConfirmed() && slot.isCandidateConfirmed());
        InterviewSlot saved = slotRepository.save(slot);
        return toResponse(saved);
    }

    @Transactional
    public InterviewResponse selectSlot(Long tenantId, Long actorUserId, String role, Long slotId) {
        AccessGuard.requireHr(role);

        InterviewSlot slot = slotRepository.findByIdAndTenantId(slotId, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khung giờ"));

        slot.setStatus(InterviewSlotStatus.SELECTED);
        slotRepository.save(slot);

        // Cancel other proposed slots of the same application
        List<InterviewSlot> others = slotRepository.findByTenantIdAndApplicationIdAndIdNot(
                tenantId, slot.getApplicationId(), slot.getId());
        others.forEach(o -> {
            if (o.getStatus() == InterviewSlotStatus.PROPOSED) {
                o.setStatus(InterviewSlotStatus.CANCELLED);
            }
        });
        slotRepository.saveAll(others);

        // Automatically create Interview
        ApplicationSummaryResponse application = fetchApplication(tenantId, slot.getApplicationId());
        long duration = Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes();
        int durationMinutes = duration > 0 ? (int) duration : 60;

        List<UserSummaryResponse> interviewerPool = authServiceClient.getUsers(tenantId, "HIRING_MANAGER");
        List<Long> interviewerIds = interviewerPool != null && !interviewerPool.isEmpty()
                ? List.of(interviewerPool.get(0).id())
                : List.of();

        Interview interview = Interview.builder()
                .tenantId(tenantId)
                .applicationId(slot.getApplicationId())
                .jobPostingId(application.jobPostingId())
                .candidateId(application.candidateId())
                .candidateNameSnapshot(application.candidateName())
                .scheduledAt(slot.getStartTime())
                .durationMinutes(durationMinutes)
                .format(slot.getFormat())
                .location(slot.getLocation())
                .meetingLink(slot.getMeetingLink())
                .status(InterviewStatus.SCHEDULED)
                .note("Tạo tự động từ khung giờ xếp lịch 3 bên #" + slot.getId())
                .build();

        if (interviewerPool != null) {
            Map<Long, String> nameMap = interviewerPool.stream()
                    .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

            interviewerIds.forEach(id -> interview.getInterviewers().add(
                    InterviewInterviewer.builder()
                            .interview(interview)
                            .interviewerId(id)
                            .interviewerNameSnapshot(nameMap.get(id))
                            .build()
            ));
        }

        Interview savedInterview = interviewRepository.save(interview);

        interviewerIds.forEach(id -> evaluationRepository.save(
                InterviewEvaluation.builder()
                        .interview(savedInterview)
                        .interviewerId(id)
                        .build()
        ));

        eventPublisher.publishInterviewScheduled(
                tenantId, savedInterview.getId(), savedInterview.getApplicationId(), savedInterview.getScheduledAt());

        return toInterviewResponse(savedInterview);
    }

    private ApplicationSummaryResponse fetchApplication(Long tenantId, Long applicationId) {
        try {
            return applicationServiceClient.getApplicationById(tenantId, applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
    }

    private Long resolveCandidateId(Long tenantId, Long userId) {
        try {
            CandidateSummaryResponse res = candidateServiceClient.getByUserId(tenantId, userId);
            return res.id();
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng viên");
        }
    }

    private InterviewSlotResponse toResponse(InterviewSlot slot) {
        return new InterviewSlotResponse(
                slot.getId(),
                slot.getApplicationId(),
                slot.getCandidateNameSnapshot(),
                slot.getStartTime(),
                slot.getEndTime(),
                slot.getFormat(),
                slot.getLocation(),
                slot.getMeetingLink(),
                slot.getStatus(),
                slot.isDepartmentConfirmed(),
                slot.isCandidateConfirmed(),
                slot.isMatched()
        );
    }

    private InterviewResponse toInterviewResponse(Interview interview) {
        List<InterviewerSummary> interviewerSummaries = interview.getInterviewers() != null
                ? interview.getInterviewers().stream()
                .map(i -> new InterviewerSummary(i.getInterviewerId(), i.getInterviewerNameSnapshot(), false))
                .toList()
                : new ArrayList<>();

        return new InterviewResponse(
                interview.getId(),
                interview.getApplicationId(),
                interview.getCandidateNameSnapshot(),
                interview.getScheduledAt(),
                interview.getDurationMinutes(),
                interview.getFormat(),
                interview.getLocation(),
                interview.getMeetingLink(),
                interview.getNote(),
                interview.getStatus(),
                interview.getCandidateConfirmedAt() != null,
                interviewerSummaries
        );
    }
}
