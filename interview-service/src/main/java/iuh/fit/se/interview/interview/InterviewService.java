package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.dto.*;
import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.InterviewEvaluation;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.exception.BusinessException;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleItem;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleRequest;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.CandidateInterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewerSummary;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final InterviewEventPublisher eventPublisher;
    private final IcsService icsService;

    public List<InterviewResponse> getAll(
            CurrentUser actor, Long applicationId, Long jobPostingId,
            Long interviewerId, InterviewStatus status, LocalDateTime fromDate, LocalDateTime toDate) {

        List<Interview> interviews;

        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            long candidateId = resolveCandidateId(actor.userId());
            interviews = interviewRepository
                    .findByCandidateIdOrderByScheduledAtDesc(candidateId);
        } else if (role == AuthorizationPolicy.Role.HIRING_MANAGER) {
            interviews = interviewRepository.findForHiringManager(actor.departmentId(), actor.userId());
        } else if (role == AuthorizationPolicy.Role.COMPANY_ADMIN
                || role == AuthorizationPolicy.Role.RECRUITER) {
            // HR (RECRUITER) phu trach tuyen dung toan cong ty nen xem duoc moi lich phong van.
            if (jobPostingId != null) {
                interviews = interviewRepository.findByJobPostingIdOrderByScheduledAtDesc(jobPostingId);
            } else if (applicationId != null) {
                interviews = interviewRepository.findByApplicationIdOrderByScheduledAtDesc(applicationId);
            } else {
                interviews = interviewRepository.findAllByOrderByScheduledAtDesc();
            }
        } else {
            throw new AccessDeniedException("Bạn không có quyền xem lịch phỏng vấn");
        }

        if (applicationId != null) {
            interviews = interviews.stream().filter(i -> i.getApplicationId().equals(applicationId)).toList();
        }
        if (jobPostingId != null) {
            interviews = interviews.stream().filter(i -> i.getJobPostingId().equals(jobPostingId)).toList();
        }
        if (interviewerId != null) {
            interviews = interviews.stream()
                    .filter(i -> i.getInterviewers().stream()
                            .anyMatch(iv -> iv.getInterviewerId().equals(interviewerId)))
                    .toList();
        }
        if (status != null) {
            interviews = interviews.stream().filter(i -> i.getStatus() == status).toList();
        }
        if (fromDate != null) {
            interviews = interviews.stream().filter(i -> !i.getScheduledAt().isBefore(fromDate)).toList();
        }
        if (toDate != null) {
            interviews = interviews.stream().filter(i -> !i.getScheduledAt().isAfter(toDate)).toList();
        }

        return interviews.stream()
                .map(this::toResponse)
                .toList();
    }

    public InterviewResponse getById(CurrentUser actor, Long id) {
        Interview interview = findById(id);
        assertCanView(interview, actor);
        return toResponse(interview);
    }

    public List<CandidateInterviewResponse> getMyInterviews(CurrentUser actor) {
        AuthorizationPolicy.requireCandidate(actor);
        long candidateId = resolveCandidateId(actor.userId());
        return interviewRepository.findByCandidateIdOrderByScheduledAtDesc(candidateId).stream()
                .map(this::toCandidateResponse)
                .toList();
    }

    public CandidateInterviewResponse getMyInterview(
            CurrentUser actor, Long id) {
        AuthorizationPolicy.requireCandidate(actor);
        Interview interview = findById(id);
        long candidateId = resolveCandidateId(actor.userId());
        if (!Objects.equals(interview.getCandidateId(), candidateId)) {
            throw new AccessDeniedException("Day khong phai lich phong van cua ban");
        }
        return toCandidateResponse(interview);
    }

    public String generateIcs(CurrentUser actor, Long id) {
        Interview interview = findById(id);
        assertCanView(interview, actor);
        return icsService.generate(interview, resolveWorkLocationName(interview.getWorkLocationId()));
    }



    @Transactional
    public InterviewResponse create(CurrentUser actor, InterviewCreateRequest req) {
        AuthorizationPolicy.requireHr(actor);
        ApplicationSummaryResponse application = fetchApplication(req.applicationId());

        if (STAGE_REJECTED.equals(application.currentStageType())
                || STAGE_HIRED.equals(application.currentStageType())) {
            throw new BusinessException("Không thể lên lịch cho hồ sơ đã kết thúc");
        }

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(application.pipelineId());

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
        if (req.format() == InterviewFormat.OFFLINE && req.workLocationId() == null) {
            throw new BusinessException("Phỏng vấn Offline cần chọn địa điểm");
        }
        if (req.workLocationId() != null) {
            validateWorkLocation(req.workLocationId());
        }

        List<UserSummaryResponse> interviewerPool = authServiceClient.getUsers("HIRING_MANAGER");
        Map<Long, String> interviewerNameMap = interviewerPool == null
                ? Map.of()
                : interviewerPool.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        boolean allValid = req.interviewerIds().stream().allMatch(interviewerNameMap::containsKey);
        if (!allValid) {
            throw new BusinessException("Danh sách người phỏng vấn chứa tài khoản không hợp lệ (chỉ Phòng ban)");
        }

        Interview interview = Interview.builder()
                .applicationId(req.applicationId())
                .jobPostingId(application.jobPostingId())
                .departmentId(application.departmentId())
                .assignedRecruiterId(application.assignedRecruiterId())
                .candidateId(application.candidateId())
                .candidateNameSnapshot(application.candidateName())
                .scheduledAt(req.scheduledAt())
                .durationMinutes(req.durationMinutes())
                .format(req.format())
                .workLocationId(req.workLocationId())
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
                saved.getId(), saved.getApplicationId(), saved.getScheduledAt());

        return toResponse(saved);
    }

    /**
     * Xếp lịch hàng loạt cho nhiều hồ sơ ứng tuyển với cùng người phỏng vấn / hình thức.
     * Các khung giờ được chia nối tiếp nhau theo {@code durationMinutesPerPerson}, bắt đầu từ
     * {@code startTime}; nếu một khung giờ trùng với lịch đã có của bất kỳ người phỏng vấn nào
     * (kể cả các khung vừa xếp trong cùng lượt này), hệ thống tự động dời sang khung giờ rảnh
     * kế tiếp thay vì tạo lịch trùng.
     */
    @Transactional
    public List<InterviewBulkScheduleItem> bulkSchedule(
            CurrentUser actor, InterviewBulkScheduleRequest req) {

        AuthorizationPolicy.requireHr(actor);

        if (req.format() == InterviewFormat.ONLINE
                && (req.meetingLink() == null || req.meetingLink().isBlank())) {
            throw new BusinessException("Phỏng vấn Online cần nhập link họp");
        }
        if (req.format() == InterviewFormat.OFFLINE && req.workLocationId() == null) {
            throw new BusinessException("Phỏng vấn Offline cần chọn địa điểm");
        }
        if (req.workLocationId() != null) {
            validateWorkLocation(req.workLocationId());
        }

        List<UserSummaryResponse> interviewerPool = authServiceClient.getUsers("HIRING_MANAGER");
        Map<Long, String> interviewerNameMap = interviewerPool == null
                ? Map.of()
                : interviewerPool.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        boolean allValid = req.interviewerIds().stream().allMatch(interviewerNameMap::containsKey);
        if (!allValid) {
            throw new BusinessException("Danh sách người phỏng vấn chứa tài khoản không hợp lệ (chỉ Phòng ban)");
        }

        List<Interview> existing = interviewRepository.findByInterviewers_InterviewerIdInAndStatusIn(
                req.interviewerIds(), List.of(InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED));

        List<BusyRange> busyRanges = new ArrayList<>(existing.stream()
                .map(i -> new BusyRange(i.getScheduledAt(), i.getScheduledAt().plusMinutes(i.getDurationMinutes())))
                .toList());

        List<InterviewBulkScheduleItem> results = new ArrayList<>();
        LocalDateTime cursor = req.startTime();
        int durationMinutes = req.durationMinutesPerPerson();

        for (Long applicationId : req.applicationIds()) {
            ApplicationSummaryResponse application = fetchApplication(applicationId);

            if (STAGE_REJECTED.equals(application.currentStageType())
                    || STAGE_HIRED.equals(application.currentStageType())) {
                throw new BusinessException(
                        "Hồ sơ của " + application.candidateName() + " đã kết thúc, không thể lên lịch");
            }

            PipelineResponse pipeline = masterDataServiceClient.getPipelineById(application.pipelineId());
            PipelineStageResponse cvScreeningStage = pipeline.stages().stream()
                    .filter(s -> CV_SCREENING.equals(s.stageType()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng không có giai đoạn Sàng lọc CV"));
            if (application.currentStageOrder() == null
                    || application.currentStageOrder() <= cvScreeningStage.stageOrder()) {
                throw new BusinessException(
                        "Hồ sơ của " + application.candidateName() + " chưa vượt qua Sàng lọc CV");
            }

            LocalDateTime slotStart = cursor;
            LocalDateTime slotEnd = slotStart.plusMinutes(durationMinutes);
            while (overlapsAny(busyRanges, slotStart, slotEnd)) {
                slotStart = slotStart.plusMinutes(durationMinutes);
                slotEnd = slotStart.plusMinutes(durationMinutes);
            }
            boolean shifted = !slotStart.equals(cursor);

            Interview interview = Interview.builder()
                    .applicationId(applicationId)
                    .jobPostingId(application.jobPostingId())
                    .departmentId(application.departmentId())
                    .assignedRecruiterId(application.assignedRecruiterId())
                    .candidateId(application.candidateId())
                    .candidateNameSnapshot(application.candidateName())
                    .scheduledAt(slotStart)
                    .durationMinutes(durationMinutes)
                    .format(req.format())
                    .workLocationId(req.workLocationId())
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

            req.interviewerIds().forEach(interviewerId ->
                    evaluationRepository.save(InterviewEvaluation.builder()
                            .interview(saved)
                            .interviewerId(interviewerId)
                            .build()));

            eventPublisher.publishInterviewScheduled(
                    saved.getId(), saved.getApplicationId(), saved.getScheduledAt());

            busyRanges.add(new BusyRange(slotStart, slotEnd));
            results.add(new InterviewBulkScheduleItem(
                    applicationId, application.candidateName(), slotStart, durationMinutes, shifted, toResponse(saved)));

            cursor = slotEnd;
        }

        return results;
    }

    private boolean overlapsAny(List<BusyRange> busyRanges, LocalDateTime start, LocalDateTime end) {
        return busyRanges.stream().anyMatch(b -> start.isBefore(b.end()) && end.isAfter(b.start()));
    }

    private record BusyRange(LocalDateTime start, LocalDateTime end) {}

    @Transactional
    public InterviewResponse cancel(Long id) {
        Interview interview = findById(id);
        fetchApplication(interview.getApplicationId());
        if (interview.getStatus() != InterviewStatus.SCHEDULED
                && interview.getStatus() != InterviewStatus.CONFIRMED) {
            throw new BusinessException("Chỉ hủy được lịch đang chờ hoặc đã xác nhận");
        }
        interview.setStatus(InterviewStatus.CANCELLED);
        return toResponse(interviewRepository.save(interview));
    }

    @Transactional
    public InterviewResponse confirmByCandidate(Long userId, Long id) {
        Interview interview = findById(id);
        long candidateId = resolveCandidateId(userId);
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
                saved.getId(), saved.getApplicationId(),
                saved.getScheduledAt(), saved.getCandidateNameSnapshot());

        return toResponse(saved);
    }

    public void requireCanView(Interview interview, CurrentUser actor) {
        assertCanView(interview, actor);
    }

    private void assertCanView(Interview interview, CurrentUser actor) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        // COMPANY_ADMIN va HR (RECRUITER) deu phu trach toan cong ty, khong gioi han phong ban.
        if (role == AuthorizationPolicy.Role.COMPANY_ADMIN
                || role == AuthorizationPolicy.Role.RECRUITER) {
            return;
        }
        boolean sameDepartment = actor.departmentId() != null
                && actor.departmentId().equals(interview.getDepartmentId());
        if (role == AuthorizationPolicy.Role.HIRING_MANAGER) {
            boolean assigned = interview.getInterviewers().stream()
                    .anyMatch(i -> i.getInterviewerId().equals(actor.userId()));
            if (!sameDepartment && !assigned) {
                throw new AccessDeniedException("Bạn không được truy cập buổi phỏng vấn này");
            }
            return;
        }
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            long candidateId = resolveCandidateId(actor.userId());
            if (!Objects.equals(interview.getCandidateId(), candidateId)) {
                throw new AccessDeniedException("Đây không phải lịch phỏng vấn của bạn");
            }
            return;
        }
        throw new AccessDeniedException("Bạn không có quyền xem");
    }

    private void validateWorkLocation(Long workLocationId) {
        boolean valid = masterDataServiceClient.getWorkLocations().stream()
                .anyMatch(w -> w.id().equals(workLocationId) && w.active());
        if (!valid) throw new BusinessException("Địa điểm phỏng vấn không hợp lệ");
    }

    private String resolveWorkLocationName(Long workLocationId) {
        if (workLocationId == null) return null;
        return masterDataServiceClient.getWorkLocations().stream()
                .filter(w -> w.id().equals(workLocationId))
                .findFirst()
                .map(w -> w.name())
                .orElse(null);
    }

    private long resolveCandidateId(Long userId) {
        try {
            return candidateServiceClient.getByUserId(userId).id();
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng viên gắn với tài khoản");
        }
    }

    private ApplicationSummaryResponse fetchApplication(Long applicationId) {
        try {
            return applicationServiceClient.getApplicationById(applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
    }

    private CandidateInterviewResponse toCandidateResponse(Interview interview) {
        return new CandidateInterviewResponse(
                interview.getId(),
                interview.getApplicationId(),
                interview.getScheduledAt(),
                interview.getDurationMinutes(),
                interview.getFormat(),
                interview.getWorkLocationId(),
                interview.getMeetingLink(),
                interview.getStatus(),
                interview.getCandidateConfirmedAt() != null,
                interview.getInterviewers().stream()
                        .map(InterviewInterviewer::getInterviewerNameSnapshot)
                        .toList());
    }

    private Interview findById(Long id) {
        return interviewRepository.findById(id)
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
                interview.getWorkLocationId(),
                interview.getMeetingLink(),
                interview.getNote(),
                interview.getStatus(),
                interview.getCandidateConfirmedAt() != null,
                interviewerSummaries
        );
    }
}
