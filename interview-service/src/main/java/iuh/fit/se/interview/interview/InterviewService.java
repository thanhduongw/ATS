package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.RecruitmentServiceClient;
import iuh.fit.se.interview.client.dto.*;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.InterviewEvaluation;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewerSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private static final String CV_SCREENING = "CV_SCREENING";
    private static final String STAGE_REJECTED = "REJECTED";
    private static final String STAGE_HIRED = "HIRED";

    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final RecruitmentServiceClient recruitmentServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final InterviewEventPublisher eventPublisher;
    private final IcsService icsService;

    public List<InterviewResponse> getAll(
            Long tenantId, Long userId, String role, Long applicationId) {

        List<Interview> interviews;

        if (AccessGuard.isCandidate(role)) {
            long candidateId = resolveCandidateId(tenantId, userId);
            interviews = interviewRepository
                    .findByTenantIdAndCandidateIdOrderByScheduledAtDesc(tenantId, candidateId);
            if (applicationId != null) {
                interviews = interviews.stream()
                        .filter(i -> i.getApplicationId().equals(applicationId))
                        .toList();
            }
        } else if (AccessGuard.isDepartment(role)) {
            interviews = interviewRepository
                    .findByTenantIdAndInterviewers_InterviewerIdOrderByScheduledAtDesc(tenantId, userId);
            if (applicationId != null) {
                interviews = interviews.stream()
                        .filter(i -> i.getApplicationId().equals(applicationId))
                        .toList();
            }
        } else if (AccessGuard.isHr(role)) {
            interviews = applicationId != null
                    ? interviewRepository.findByTenantIdAndApplicationIdOrderByScheduledAtDesc(tenantId, applicationId)
                    : interviewRepository.findByTenantIdOrderByScheduledAtDesc(tenantId);
        } else {
            throw new AccessDeniedException("Bạn không có quyền xem lịch phỏng vấn");
        }

        return interviews.stream().map(this::toResponse).toList();
    }

    public InterviewResponse getById(Long tenantId, Long userId, String role, Long id) {
        Interview interview = findOwned(tenantId, id);
        if (!"SYSTEM".equals(role)) {
            assertCanView(interview, userId, role);
        }
        return toResponse(interview);
    }

    public String generateIcs(Long tenantId, Long userId, String role, Long id) {
        Interview interview = findOwned(tenantId, id);
        assertCanView(interview, userId, role);
        return icsService.generate(interview);
    }



    @Transactional
    public InterviewResponse create(Long tenantId, Long actorUserId, InterviewCreateRequest req) {
        ApplicationSummaryResponse application = fetchApplication(tenantId, req.applicationId());

        if (STAGE_REJECTED.equals(application.currentStageType())
                || STAGE_HIRED.equals(application.currentStageType())) {
            throw new BusinessException("Không thể lên lịch cho hồ sơ đã kết thúc");
        }

        JobPostingResponse posting = recruitmentServiceClient.getPostingById(application.jobPostingId());
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(posting.pipelineId());

        PipelineStageResponse cvScreeningStage = pipeline.stages().stream()
                .filter(s -> CV_SCREENING.equals(s.stageType()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng không có giai đoạn Sàng lọc CV"));

        if (application.currentStageOrder() == null
                || application.currentStageOrder() <= cvScreeningStage.stageOrder()) {
            throw new BusinessException("Chỉ lên lịch phỏng vấn khi hồ sơ đã vượt qua giai đoạn Sàng lọc CV");
        }

        if (req.format() == InterviewFormat.ONLINE
                && (req.meetingLink() == null || req.meetingLink().isBlank())) {
            throw new BusinessException("Phỏng vấn Online cần nhập link họp");
        }
        if (req.format() == InterviewFormat.OFFLINE
                && (req.location() == null || req.location().isBlank())) {
            throw new BusinessException("Phỏng vấn Offline cần nhập địa điểm");
        }

        List<UserSummaryResponse> interviewerPool = authServiceClient.getUsers(tenantId, "HIRING_MANAGER");
        Map<Long, String> interviewerNameMap = interviewerPool == null
                ? Map.of()
                : interviewerPool.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        boolean allValid = req.interviewerIds().stream().allMatch(interviewerNameMap::containsKey);
        if (!allValid) {
            throw new BusinessException("Danh sách người phỏng vấn chứa tài khoản không hợp lệ (chỉ Phòng ban)");
        }

        Interview interview = Interview.builder()
                .tenantId(tenantId)
                .applicationId(req.applicationId())
                .jobPostingId(application.jobPostingId())
                .candidateId(application.candidateId())
                .candidateNameSnapshot(application.candidateName())
                .scheduledAt(req.scheduledAt())
                .durationMinutes(req.durationMinutes())
                .format(req.format())
                .location(req.location())
                .meetingLink(req.meetingLink())
                .note(req.note())
                .status(InterviewStatus.SCHEDULED)
                .build();

        req.interviewerIds().forEach(interviewerId ->
                interview.getInterviewers().add(InterviewInterviewer.builder()
                        .interview(interview)
                        .interviewerId(interviewerId)
                        .interviewerNameSnapshot(interviewerNameMap.get(interviewerId))
                        .build()));

        Interview saved = interviewRepository.save(interview);

        // Placeholder evaluation rows
        req.interviewerIds().forEach(interviewerId ->
                evaluationRepository.save(InterviewEvaluation.builder()
                        .interview(saved)
                        .interviewerId(interviewerId)
                        .build()));

        eventPublisher.publishInterviewScheduled(
                tenantId, saved.getId(), saved.getApplicationId(), saved.getScheduledAt());

        return toResponse(saved);
    }

    @Transactional
    public InterviewResponse cancel(Long tenantId, Long id) {
        Interview interview = findOwned(tenantId, id);
        if (interview.getStatus() != InterviewStatus.SCHEDULED
                && interview.getStatus() != InterviewStatus.CONFIRMED) {
            throw new BusinessException("Chỉ hủy được lịch đang chờ hoặc đã xác nhận");
        }
        interview.setStatus(InterviewStatus.CANCELLED);
        return toResponse(interviewRepository.save(interview));
    }

    @Transactional
    public InterviewResponse confirmByCandidate(Long tenantId, Long userId, Long id) {
        Interview interview = findOwned(tenantId, id);
        long candidateId = resolveCandidateId(tenantId, userId);
        if (!Objects.equals(interview.getCandidateId(), candidateId)) {
            throw new AccessDeniedException("Đây không phải lịch phỏng vấn của bạn");
        }
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new BusinessException("Chỉ xác nhận được lịch ở trạng thái Đã lên lịch");
        }
        interview.setStatus(InterviewStatus.CONFIRMED);
        interview.setCandidateConfirmedAt(LocalDateTime.now());
        Interview saved = interviewRepository.save(interview);

        eventPublisher.publishInterviewConfirmed(
                tenantId, saved.getId(), saved.getApplicationId(),
                saved.getScheduledAt(), saved.getCandidateNameSnapshot());

        return toResponse(saved);
    }

    private void assertCanView(Interview interview, Long userId, String role) {
        if (AccessGuard.isHr(role)) return;
        if (AccessGuard.isDepartment(role)) {
            boolean assigned = interview.getInterviewers().stream()
                    .anyMatch(i -> i.getInterviewerId().equals(userId));
            if (!assigned) {
                throw new AccessDeniedException("Bạn không được phân công buổi phỏng vấn này");
            }
            return;
        }
        if (AccessGuard.isCandidate(role)) {
            long candidateId = resolveCandidateId(tenantIdSafe(interview), userId);
            if (!Objects.equals(interview.getCandidateId(), candidateId)) {
                throw new AccessDeniedException("Đây không phải lịch phỏng vấn của bạn");
            }
            return;
        }
        throw new AccessDeniedException("Bạn không có quyền xem");
    }

    private Long tenantIdSafe(Interview interview) {
        return interview.getTenantId();
    }

    private long resolveCandidateId(Long tenantId, Long userId) {
        try {
            return candidateServiceClient.getByUserId(tenantId, userId).id();
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng viên gắn với tài khoản");
        }
    }

    private ApplicationSummaryResponse fetchApplication(Long tenantId, Long applicationId) {
        try {
            return applicationServiceClient.getApplicationById(tenantId, applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
    }

    private Interview findOwned(Long tenantId, Long id) {
        return interviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy buổi phỏng vấn"));
    }

    private InterviewResponse toResponse(Interview interview) {
        Map<Long, InterviewEvaluation> evalByInterviewer = evaluationRepository
                .findByInterviewId(interview.getId())
                .stream()
                .collect(Collectors.toMap(InterviewEvaluation::getInterviewerId, e -> e, (a, b) -> a));

        List<InterviewerSummary> interviewerSummaries = interview.getInterviewers().stream()
                .map(i -> new InterviewerSummary(
                        i.getInterviewerId(),
                        i.getInterviewerNameSnapshot(),
                        evalByInterviewer.containsKey(i.getInterviewerId())
                                && evalByInterviewer.get(i.getInterviewerId()).getSubmittedAt() != null))
                .toList();

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