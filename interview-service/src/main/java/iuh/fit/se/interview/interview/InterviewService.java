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
import iuh.fit.se.interview.interview.dto.InterviewHmRejectRequest;
import iuh.fit.se.interview.interview.dto.InterviewUpdateRequest;
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
                .filter(i -> i.getStatus().visibleToCandidate())
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
        if (!interview.getStatus().visibleToCandidate()) {
            throw new AccessDeniedException("Lịch phỏng vấn này chưa được công bố");
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
            throw new BusinessException("Phỏng vấn trực tuyến cần nhập đường dẫn họp");
        }
        if (req.format() == InterviewFormat.OFFLINE && req.workLocationId() == null) {
            throw new BusinessException("Phỏng vấn trực tiếp cần chọn địa điểm");
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
                        .applicationId(saved.getApplicationId())
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
            throw new BusinessException("Phỏng vấn trực tuyến cần nhập đường dẫn họp");
        }
        if (req.format() == InterviewFormat.OFFLINE && req.workLocationId() == null) {
            throw new BusinessException("Phỏng vấn trực tiếp cần chọn địa điểm");
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
                req.interviewerIds(), List.copyOf(InterviewStatus.BLOCKING));

        List<BusyRange> busyRanges = new ArrayList<>(existing.stream()
                .map(i -> new BusyRange(i.getScheduledAt(), i.getScheduledAt().plusMinutes(i.getDurationMinutes())))
                .toList());

        List<InterviewBulkScheduleItem> results = new ArrayList<>();
        List<PendingBatchItem> batch = new ArrayList<>();
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
                            .applicationId(saved.getApplicationId())
                            .interviewerId(interviewerId)
                            .build()));

            eventPublisher.publishInterviewScheduled(
                    saved.getId(), saved.getApplicationId(), saved.getScheduledAt());

            busyRanges.add(new BusyRange(slotStart, slotEnd));
            batch.add(new PendingBatchItem(saved, shifted));

            cursor = slotEnd;
        }

        // Cả lô mang chung session_id (lấy id buổi đầu tiên) để giao diện gom nhóm được.
        // Trạng thái vẫn độc lập từng buổi — no-show và đánh giá là theo từng ứng viên.
        if (batch.size() > 1) {
            Long sessionId = batch.get(0).interview().getId();
            batch.forEach(p -> p.interview().setSessionId(sessionId));
            interviewRepository.saveAll(batch.stream().map(PendingBatchItem::interview).toList());
        }

        for (PendingBatchItem p : batch) {
            Interview saved = p.interview();
            results.add(new InterviewBulkScheduleItem(
                    saved.getApplicationId(), saved.getCandidateNameSnapshot(),
                    saved.getScheduledAt(), saved.getDurationMinutes(), p.shifted(), toResponse(saved)));
        }

        return results;
    }

    private boolean overlapsAny(List<BusyRange> busyRanges, LocalDateTime start, LocalDateTime end) {
        return busyRanges.stream().anyMatch(b -> start.isBefore(b.end()) && end.isAfter(b.start()));
    }

    private record BusyRange(LocalDateTime start, LocalDateTime end) {}

    private record PendingBatchItem(Interview interview, boolean shifted) {}

    /** HM được phân công (hoặc HR thay mặt) chốt giờ — ứng viên được thông báo từ đây. */
    @Transactional
    public InterviewResponse confirmByHm(CurrentUser actor, Long id) {
        Interview interview = findById(id);
        assertAssignedHmOrHr(interview, actor);
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new BusinessException("Chỉ xác nhận được lịch đang chờ phòng ban xác nhận");
        }
        markHmConfirmed(interview);
        return saveAndNotifyCandidate(interview);
    }

    /**
     * HM từ chối giờ HR đặt. Kèm giờ đề xuất → chờ HR duyệt; không kèm → hủy luôn.
     */
    @Transactional
    public InterviewResponse rejectByHm(CurrentUser actor, Long id, InterviewHmRejectRequest req) {
        Interview interview = findById(id);
        assertAssignedHmOrHr(interview, actor);
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new BusinessException("Chỉ từ chối được lịch đang chờ phòng ban xác nhận");
        }
        if (req.proposedScheduledAt() != null) {
            if (!req.proposedScheduledAt().isAfter(LocalDateTime.now())) {
                throw new BusinessException("Giờ đề xuất phải nằm trong tương lai");
            }
            if (req.proposedScheduledAt().equals(interview.getScheduledAt())) {
                throw new BusinessException("Giờ đề xuất phải khác giờ hiện tại");
            }
        }
        interview.setProposalNote(req.note());
        if (req.proposedScheduledAt() == null) {
            interview.setStatus(InterviewStatus.CANCELLED);
        } else {
            interview.setProposedScheduledAt(req.proposedScheduledAt());
            interview.setStatus(InterviewStatus.HM_RESCHEDULE_PROPOSED);
        }
        return toResponse(interviewRepository.save(interview));
    }

    /** HR duyệt giờ HM đề xuất — chốt luôn, không gửi lại cho HM xác nhận lần nữa. */
    @Transactional
    public InterviewResponse approveHmProposal(CurrentUser actor, Long id) {
        AuthorizationPolicy.requireHr(actor);
        Interview interview = findById(id);
        if (interview.getStatus() != InterviewStatus.HM_RESCHEDULE_PROPOSED) {
            throw new BusinessException("Buổi phỏng vấn này không có đề xuất đổi lịch đang chờ");
        }
        if (interview.getProposedScheduledAt() == null
                || !interview.getProposedScheduledAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException("Giờ đề xuất đã qua, vui lòng yêu cầu phòng ban đề xuất lại");
        }
        interview.setScheduledAt(interview.getProposedScheduledAt());
        interview.setProposedScheduledAt(null);
        interview.setProposalNote(null);
        markHmConfirmed(interview);
        return saveAndNotifyCandidate(interview);
    }

    /** HM ghi nhận ứng viên đã xác nhận nhưng không đến. */
    @Transactional
    public InterviewResponse markNoShow(CurrentUser actor, Long id) {
        Interview interview = findById(id);
        assertAssignedHmOrHr(interview, actor);
        if (!InterviewStatus.HELD.contains(interview.getStatus())) {
            throw new BusinessException("Chỉ ghi nhận vắng mặt cho buổi ứng viên đã xác nhận");
        }
        interview.setStatus(InterviewStatus.NO_SHOW);
        return toResponse(interviewRepository.save(interview));
    }

    /**
     * HR dời lịch tại chỗ — không lưu lịch sử các lần dời. Nếu ứng viên đã xác nhận thì
     * giờ cũ hết giá trị: trạng thái lùi về HM_CONFIRMED và ứng viên phải xác nhận lại.
     * Trùng lịch chỉ cảnh báo ở giao diện, không chặn ở đây.
     */
    @Transactional
    public InterviewResponse update(CurrentUser actor, Long id, InterviewUpdateRequest req) {
        AuthorizationPolicy.requireHr(actor);
        Interview interview = findById(id);
        if (!InterviewStatus.RESCHEDULABLE.contains(interview.getStatus())) {
            throw new BusinessException("Không dời được lịch ở trạng thái hiện tại");
        }
        if (!req.scheduledAt().isAfter(LocalDateTime.now())) {
            throw new BusinessException("Thời gian mới phải nằm trong tương lai");
        }
        if (req.scheduledAt().withSecond(0).withNano(0)
                .equals(interview.getScheduledAt().withSecond(0).withNano(0))) {
            throw new BusinessException("Thời gian mới phải khác thời gian hiện tại");
        }
        if (req.format() == InterviewFormat.ONLINE
                && (req.meetingLink() == null || req.meetingLink().isBlank())) {
            throw new BusinessException("Phỏng vấn trực tuyến cần nhập đường dẫn họp");
        }
        if (req.format() == InterviewFormat.OFFLINE && req.workLocationId() == null) {
            throw new BusinessException("Phỏng vấn trực tiếp cần chọn địa điểm");
        }
        if (req.workLocationId() != null) {
            validateWorkLocation(req.workLocationId());
        }

        boolean needsReconfirm = interview.getStatus() == InterviewStatus.CANDIDATE_CONFIRMED;
        boolean candidateAlreadyNotified = interview.getStatus() == InterviewStatus.HM_CONFIRMED;

        interview.setScheduledAt(req.scheduledAt());
        interview.setDurationMinutes(req.durationMinutes());
        interview.setFormat(req.format());
        interview.setWorkLocationId(req.workLocationId());
        interview.setMeetingLink(req.meetingLink());
        interview.setNote(req.note());

        if (needsReconfirm) {
            interview.setCandidateConfirmedAt(null);
            markHmConfirmed(interview);
            return saveAndNotifyCandidate(interview);
        }
        if (candidateAlreadyNotified) {
            return saveAndNotifyCandidate(interview);
        }
        return toResponse(interviewRepository.save(interview));
    }

    private void markHmConfirmed(Interview interview) {
        interview.setStatus(InterviewStatus.HM_CONFIRMED);
        interview.setHmConfirmedAt(LocalDateTime.now());
    }

    /** Lưu rồi mới bắn sự kiện, tránh báo cho ứng viên một thay đổi chưa kịp ghi. */
    private InterviewResponse saveAndNotifyCandidate(Interview interview) {
        Interview saved = interviewRepository.save(interview);
        eventPublisher.publishInterviewHmConfirmed(
                saved.getId(), saved.getApplicationId(),
                saved.getScheduledAt(), saved.getCandidateNameSnapshot());
        return toResponse(saved);
    }

    /** HM phải được phân công đúng buổi này; HR và Admin thì toàn quyền. */
    private void assertAssignedHmOrHr(Interview interview, CurrentUser actor) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.RECRUITER
                || role == AuthorizationPolicy.Role.COMPANY_ADMIN) {
            return;
        }
        boolean assigned = role == AuthorizationPolicy.Role.HIRING_MANAGER
                && interview.getInterviewers().stream()
                        .anyMatch(i -> i.getInterviewerId().equals(actor.userId()));
        if (!assigned) {
            throw new AccessDeniedException("Bạn không được phân công buổi phỏng vấn này");
        }
    }

    @Transactional
    public InterviewResponse cancel(Long id) {
        Interview interview = findById(id);
        fetchApplication(interview.getApplicationId());
        if (!InterviewStatus.CANCELLABLE.contains(interview.getStatus())) {
            throw new BusinessException("Không hủy được buổi phỏng vấn đã kết thúc");
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
        if (interview.getStatus() != InterviewStatus.HM_CONFIRMED) {
            throw new BusinessException("Chỉ xác nhận được lịch đã được phòng ban chốt giờ");
        }
        interview.setStatus(InterviewStatus.CANDIDATE_CONFIRMED);
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
        if (role == AuthorizationPolicy.Role.SYSTEM) {
            return;
        }
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
            if (!interview.getStatus().visibleToCandidate()) {
                throw new AccessDeniedException("Lịch phỏng vấn này chưa được công bố");
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
                interview.getCandidateId(),
                interview.getCandidateNameSnapshot(),
                interview.getJobPostingId(),
                interview.getDepartmentId(),
                interview.getScheduledAt(),
                interview.getDurationMinutes(),
                interview.getFormat(),
                interview.getWorkLocationId(),
                interview.getMeetingLink(),
                interview.getNote(),
                interview.getStatus(),
                interview.getCandidateConfirmedAt() != null,
                interview.getHmConfirmedAt() != null,
                interview.getSessionId(),
                interview.getProposedScheduledAt(),
                interview.getProposalNote(),
                interviewerSummaries,
                interview.getCreatedAt()
        );
    }
}
