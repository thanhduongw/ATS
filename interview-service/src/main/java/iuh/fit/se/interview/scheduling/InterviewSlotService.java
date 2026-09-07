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
            Long actorUserId, String role, SlotBatchCreateRequest req) {

        AccessGuard.requireHr(role);

        ApplicationSummaryResponse application = fetchApplication(req.applicationId());
        if ("REJECTED".equals(application.currentStageType()) || "HIRED".equals(application.currentStageType())) {
            throw new BusinessException("Không thể tạo khung giờ cho hồ sơ đã kết thúc");
        }

        List<InterviewSlot> slotsToSave = req.slots().stream()
                .map(s -> InterviewSlot.builder()
                        .applicationId(req.applicationId())
                        .candidateNameSnapshot(application.candidateName())
                        .startTime(s.startTime())
                        .endTime(s.endTime())
                        .format(req.format())
                        .workLocationId(req.workLocationId())
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
    public List<InterviewSlotResponse> getSlots(Long applicationId) {
        return slotRepository.findByApplicationIdOrderByStartTimeAsc(applicationId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public void requireApplicationAccess(Long applicationId) {
        fetchApplication(applicationId);
    }

    @Transactional(readOnly = true)
    public List<InterviewSlotResponse> getMyPendingSlots(Long userId, String role) {
        List<InterviewSlot> proposed = slotRepository.findByStatusOrderByStartTimeAsc(
                InterviewSlotStatus.PROPOSED);

        if (AccessGuard.isCandidate(role)) {
            Long candidateId = resolveCandidateId(userId);
            return proposed.stream()
                    .filter(s -> {
                        try {
                            ApplicationSummaryResponse app = fetchApplication(s.getApplicationId());
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
                    .filter(s -> canAccessApplication(s.getApplicationId()))
                    .map(this::toResponse)
                    .toList();
        }

        if ("COMPANY_ADMIN".equals(role)) {
            return proposed.stream().map(this::toResponse).toList();
        }

        return proposed.stream()
                .filter(s -> canAccessApplication(s.getApplicationId()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public InterviewSlotResponse confirmSlot(
            Long userId, String role, Long slotId, SlotConfirmRequest req) {

        InterviewSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khung giờ"));
        fetchApplication(slot.getApplicationId());

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
    public InterviewResponse selectSlot(Long actorUserId, String role, Long slotId) {
        AccessGuard.requireHr(role);

        InterviewSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khung giờ"));
        ApplicationSummaryResponse application = fetchApplication(slot.getApplicationId());

        slot.setStatus(InterviewSlotStatus.SELECTED);
        slotRepository.save(slot);

        // Cancel other proposed slots of the same application
        List<InterviewSlot> others = slotRepository.findByApplicationIdAndIdNot(
                slot.getApplicationId(), slot.getId());
        others.forEach(o -> {
            if (o.getStatus() == InterviewSlotStatus.PROPOSED) {
                o.setStatus(InterviewSlotStatus.CANCELLED);
            }
        });
        slotRepository.saveAll(others);

        // Automatically create Interview
        long duration = Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes();
        int durationMinutes = duration > 0 ? (int) duration : 60;

        List<UserSummaryResponse> interviewerPool = authServiceClient.getUsers("HIRING_MANAGER");
        List<Long> interviewerIds = interviewerPool != null && !interviewerPool.isEmpty()
                ? List.of(interviewerPool.get(0).id())
                : List.of();

        Interview interview = Interview.builder()
                .applicationId(slot.getApplicationId())
                .jobPostingId(application.jobPostingId())
                .departmentId(application.departmentId())
                .assignedRecruiterId(application.assignedRecruiterId())
                .candidateId(application.candidateId())
                .candidateNameSnapshot(application.candidateName())
                .scheduledAt(slot.getStartTime())
                .durationMinutes(durationMinutes)
                .format(slot.getFormat())
                .workLocationId(slot.getWorkLocationId())
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
                savedInterview.getId(), savedInterview.getApplicationId(), savedInterview.getScheduledAt());

        return toInterviewResponse(savedInterview);
    }

    private ApplicationSummaryResponse fetchApplication(Long applicationId) {
        try {
            return applicationServiceClient.getApplicationById(applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
    }

    private boolean canAccessApplication(Long applicationId) {
        try {
            fetchApplication(applicationId);
            return true;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private Long resolveCandidateId(Long userId) {
        try {
            CandidateSummaryResponse res = candidateServiceClient.getByUserId(userId);
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
                slot.getWorkLocationId(),
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
                interview.getWorkLocationId(),
                interview.getMeetingLink(),
                interview.getNote(),
                interview.getStatus(),
                interview.getCandidateConfirmedAt() != null,
                interviewerSummaries
        );
    }
}
