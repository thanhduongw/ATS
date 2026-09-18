package iuh.fit.se.application.application;

import iuh.fit.se.application.application.dto.*;
import iuh.fit.se.application.client.AuthServiceClient;
import iuh.fit.se.application.client.CandidateServiceClient;
import iuh.fit.se.application.client.MasterDataServiceClient;
import iuh.fit.se.application.client.RecruitmentServiceClient;
import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import iuh.fit.se.application.client.dto.CatalogItemResponse;
import iuh.fit.se.application.client.dto.JobPostingResponse;
import iuh.fit.se.application.client.dto.PipelineResponse;
import iuh.fit.se.application.client.dto.PipelineStageResponse;
import iuh.fit.se.application.client.dto.UserSummaryResponse;
import iuh.fit.se.application.common.PageResponse;
import iuh.fit.se.application.event.ApplicationEventPublisher;
import iuh.fit.se.application.event.AuditEventPublisher;
import iuh.fit.se.application.exception.BusinessException;
import iuh.fit.se.application.security.AuthorizationPolicy;
import iuh.fit.se.application.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private static final String STAGE_TYPE_REJECTED = "REJECTED";
    private static final String STAGE_TYPE_HIRED = "HIRED";

    private final ApplicationRepository applicationRepository;
    private final ApplicationHistoryRepository historyRepository;
    private final ApplicationCommentRepository commentRepository;
    private final CandidateServiceClient candidateServiceClient;
    private final RecruitmentServiceClient recruitmentServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditEventPublisher auditEventPublisher;

    public PageResponse<ApplicationResponse> getAll(
            CurrentUser actor,
            Long jobPostingId, Long candidateId,
            Long assignedRecruiterId, Long recruitmentSourceId, String stageType,
            LocalDate appliedFrom, LocalDate appliedTo,
            Integer page, Integer size) {

        Long effectiveCandidateId = candidateId;
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        Long scopeDepartmentId = null;
        boolean restrictToScope = false;
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            effectiveCandidateId = resolveCandidateId(actor.userId());
        } else {
            AuthorizationPolicy.requireInternal(actor);
            // HR (RECRUITER) xem duoc toan bo ho so ung tuyen cua cong ty, khong loc theo phong ban.
            if (role == AuthorizationPolicy.Role.HIRING_MANAGER) {
                scopeDepartmentId = actor.departmentId();
                restrictToScope = true;
            }
        }

        Specification<Application> spec = ApplicationSpecifications.build(
                jobPostingId, effectiveCandidateId, assignedRecruiterId, recruitmentSourceId, stageType,
                appliedFrom != null ? appliedFrom.atStartOfDay() : null,
                appliedTo != null ? appliedTo.atTime(LocalTime.MAX) : null,
                scopeDepartmentId, null, restrictToScope);

        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources());
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons());
        Map<Long, String> userMap = AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE
                ? Map.of()
                : authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        List<Application> scopedApplications = applicationRepository
                .findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<Long, JobPostingResponse> postingMap = buildPostingMap(scopedApplications);
        List<ApplicationResponse> responses = scopedApplications.stream()
                .map(application -> toResponse(application, sourceMap, reasonMap, userMap, postingMap))
                .toList();

        if (page == null && size == null) {
            return PageResponse.unpaged(responses);
        }

        int pageNumber = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        int fromIndex = Math.min(pageNumber * pageSize, responses.size());
        int toIndex = Math.min(fromIndex + pageSize, responses.size());
        int totalPages = responses.isEmpty() ? 0 : (int) Math.ceil((double) responses.size() / pageSize);
        return new PageResponse<>(responses.subList(fromIndex, toIndex), responses.size(),
                totalPages, pageNumber, pageSize);
    }

    /** Lấy thông tin (title, department) của tất cả job posting liên quan (tránh N+1). */
    private Map<Long, JobPostingResponse> buildPostingMap(List<Application> applications) {
        return applications.stream()
                .map(Application::getJobPostingId)
                .distinct()
                .collect(Collectors.toMap(id -> id, id -> safeGetPosting(id), (a, b) -> a));
    }

    public ApplicationResponse getById(CurrentUser actor, Long id) {
        Application application = findById(id);
        authorizeApplication(actor, application);
        return buildDetailedResponse(
                AuthorizationPolicy.roleOf(actor) != AuthorizationPolicy.Role.CANDIDATE,
                application);
    }

    public List<CandidateApplicationResponse> getMyApplications(CurrentUser actor) {
        AuthorizationPolicy.requireCandidate(actor);
        Long candidateId = resolveCandidateId(actor.userId());
        return applicationRepository
                .findByCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(candidateId)
                .stream()
                .map(application -> toCandidateResponse(application))
                .toList();
    }

    public CandidateApplicationResponse getMyApplication(
            CurrentUser actor, Long id) {
        AuthorizationPolicy.requireCandidate(actor);
        Application application = findById(id);
        authorizeApplication(actor, application);
        return toCandidateResponse(application);
    }

    private ApplicationResponse buildDetailedResponse(
            boolean includeInternalUserNames, Application application) {
        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources());
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons());
        Map<Long, String> userMap = includeInternalUserNames
                ? authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a))
                : Map.of();

        Map<Long, JobPostingResponse> postingMap = Map.of(
                application.getJobPostingId(),
                safeGetPosting(application.getJobPostingId())
        );

        return toResponse(application, sourceMap, reasonMap, userMap, postingMap);
    }

    private JobPostingResponse safeGetPosting(Long jobPostingId) {
        try {
            return recruitmentServiceClient.getPostingById(jobPostingId);
        } catch (Exception e) {
            return new JobPostingResponse(jobPostingId, null, null, "Job #" + jobPostingId, null, null);
        }
    }

    private ApplicationResponse toResponse(
            Application a,
            Map<Long, String> sourceMap,
            Map<Long, String> reasonMap,
            Map<Long, String> userMap,
            Map<Long, JobPostingResponse> postingMap) {

        JobPostingResponse posting = postingMap.get(a.getJobPostingId());
        String jobTitle = posting != null && posting.title() != null ? posting.title() : "Job #" + a.getJobPostingId();

        return new ApplicationResponse(
                a.getId(),
                a.getCandidateId(),
                a.getCandidateNameSnapshot(),
                a.getJobPostingId(),
                jobTitle,
                a.getDepartmentId(),
                posting != null ? posting.departmentName() : null,
                a.getRecruitmentSourceId(),
                sourceMap.getOrDefault(a.getRecruitmentSourceId(), "N/A"),
                a.getAssignedRecruiterId(),
                a.getAssignedRecruiterId() == null ? null : userMap.get(a.getAssignedRecruiterId()),
                a.getResumeUrl(),
                a.getCurrentStageId(),
                a.getCurrentStageName(),
                a.getCurrentStageOrder(),
                a.getCurrentStageType(),
                a.getRejectionReasonId(),
                a.getRejectionReasonId() == null ? null : reasonMap.get(a.getRejectionReasonId()),
                a.getNote(),
                a.getAppliedAt(),
                a.getHiredAt()
        );
    }

    public ApplicationSummaryResponse getSummaryById(Long id, CurrentUser actor) {
        Application application = findById(id);
        authorizeApplication(actor, application);
        return new ApplicationSummaryResponse(
                application.getId(),
                application.getCandidateId(),
                application.getCandidateNameSnapshot(),
                application.getCandidateEmailSnapshot(),
                application.getJobPostingId(),
                application.getPipelineId(),
                application.getDepartmentId(),
                application.getAssignedRecruiterId(),
                application.getCurrentStageOrder(),
                application.getCurrentStageType(),
                application.getCurrentStageName(),
                application.getAppliedAt()
        );
    }

    @Transactional
    public ApplicationResponse create(CurrentUser actor, ApplicationCreateRequest req) {
        boolean candidateSelfApply = AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE;
        Long effectiveCandidateId;
        Long effectiveAssignedRecruiterId;
        if (candidateSelfApply) {
            effectiveCandidateId = resolveCandidateId(actor.userId());
            effectiveAssignedRecruiterId = null;
        } else {
            AuthorizationPolicy.requireHr(actor);
            if (req.candidateId() == null) {
                throw new BusinessException("Vui long chon ung vien");
            }
            effectiveCandidateId = req.candidateId();
            effectiveAssignedRecruiterId = req.assignedRecruiterId();
        }
        CandidateSummaryResponse candidate = fetchCandidate(effectiveCandidateId);

        JobPostingResponse posting = fetchPosting(req.jobPostingId());
        if (!"OPEN".equals(posting.status())) {
            throw new BusinessException("Chỉ ứng tuyển được vào tin tuyển dụng đang mở");
        }

        if (applicationRepository.existsByCandidateIdAndJobPostingIdAndDeletedAtIsNull(
                effectiveCandidateId, req.jobPostingId())) {
            throw new BusinessException("Ứng viên này đã nộp hồ sơ vào tin tuyển dụng này rồi");
        }

        validateRecruitmentSource(req.recruitmentSourceId());
        if (effectiveAssignedRecruiterId != null) {
            validateAssignedRecruiter(effectiveAssignedRecruiterId);
        }

        String resumeUrl = candidateSelfApply
                ? candidate.cvFileUrl()
                : (req.resumeUrl() != null ? req.resumeUrl() : candidate.cvFileUrl());
        if (resumeUrl == null) {
            throw new BusinessException("Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển");
        }

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(posting.pipelineId());
        PipelineStageResponse firstStage = pipeline.stages().stream()
                .min(Comparator.comparing(PipelineStageResponse::stageOrder))
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng chưa có giai đoạn nào"));

        Application application = applicationRepository.save(Application.builder()
                .candidateId(candidate.id())
                .candidateNameSnapshot(candidate.fullName())
                .candidateEmailSnapshot(candidate.email())
                .jobPostingId(req.jobPostingId())
                .pipelineId(posting.pipelineId())
                .departmentId(requirePostingDepartment(posting))
                .recruitmentSourceId(req.recruitmentSourceId())
                .assignedRecruiterId(effectiveAssignedRecruiterId)
                .resumeUrl(resumeUrl)
                .currentStageId(firstStage.id())
                .currentStageName(firstStage.name())
                .currentStageOrder(firstStage.stageOrder())
                .currentStageType(firstStage.stageType())
                .note(req.note())
                .build());

        saveHistory(application, null, firstStage.name(), "Ứng tuyển vào vị trí", actor.userId());

        eventPublisher.publishApplicationCreated(
                req.jobPostingId(), application.getId(),
                application.getCandidateId(), application.getAssignedRecruiterId(), application.getCandidateNameSnapshot());

        return getById(actor, application.getId());
    }

    @Transactional
    public CandidateApplicationResponse createForCandidate(
            CurrentUser actor, ApplicationCreateRequest request) {
        AuthorizationPolicy.requireCandidate(actor);
        ApplicationResponse created = create(actor, request);
        return getMyApplication(actor, created.id());
    }

    @Transactional
    public ApplicationResponse advanceStage(Long id, Long actorUserId, ApplicationAdvanceStageRequest req) {
        return buildDetailedResponse(true, applyAdvanceStage(id, actorUserId, req));
    }

    /**
     * Stage transition without the response enrichment. Callers outside an HTTP request (event
     * listeners) must use this method: {@link #buildDetailedResponse} resolves internal user names
     * through Feign, which has no trusted identity to forward when there is no inbound request.
     */
    @Transactional
    public Application applyAdvanceStage(Long id, Long actorUserId, ApplicationAdvanceStageRequest req) {
        Application application = findById(id);
        ensureNotTerminal(application);

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(
                resolvePipelineId(application));

        int nextOrder = application.getCurrentStageOrder() + 1;
        PipelineStageResponse nextStage = pipeline.stages().stream()
                .filter(s -> s.stageOrder().equals(nextOrder))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Đây đã là giai đoạn cuối cùng của quy trình tuyển dụng"));

        String previousStageName = application.getCurrentStageName();

        application.setCurrentStageId(nextStage.id());
        application.setCurrentStageName(nextStage.name());
        application.setCurrentStageOrder(nextStage.stageOrder());
        application.setCurrentStageType(nextStage.stageType());
        if (STAGE_TYPE_HIRED.equals(nextStage.stageType())) {
            application.setHiredAt(LocalDateTime.now());
        }
        applicationRepository.save(application);

        saveHistory(application, previousStageName, nextStage.name(), req.note(), actorUserId);
        eventPublisher.publishApplicationStatusChanged(
                application.getId(), application.getJobPostingId(),
                application.getCandidateId(), application.getAssignedRecruiterId(),
                previousStageName, nextStage.name(), nextStage.stageType());
        auditEventPublisher.publish(actorUserId, "APPLICATION_STAGE_CHANGED", "APPLICATION", application.getId(),
                previousStageName + " → " + nextStage.name());

        return application;
    }

    @Transactional
    public ApplicationResponse reject(Long id, Long actorUserId, ApplicationRejectRequest req) {
        return buildDetailedResponse(true, applyReject(id, actorUserId, req));
    }

    /** Rejection transition without response enrichment. See {@link #applyAdvanceStage}. */
    @Transactional
    public Application applyReject(Long id, Long actorUserId, ApplicationRejectRequest req) {
        Application application = findById(id);
        ensureNotTerminal(application);

        String reasonName = validateRejectionReason(req.rejectionReasonId());

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(
                resolvePipelineId(application));

        PipelineStageResponse rejectedStage = pipeline.stages().stream()
                .filter(s -> STAGE_TYPE_REJECTED.equals(s.stageType()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng không có bước Bị loại (REJECTED)"));

        String previousStageName = application.getCurrentStageName();

        application.setCurrentStageId(rejectedStage.id());
        application.setCurrentStageName(rejectedStage.name());
        application.setCurrentStageOrder(rejectedStage.stageOrder());
        application.setCurrentStageType(rejectedStage.stageType());
        application.setRejectionReasonId(req.rejectionReasonId());
        if (req.note() != null) {
            application.setNote(req.note());
        }
        applicationRepository.save(application);

        saveHistory(application, previousStageName, rejectedStage.name(), req.note(), actorUserId);
        eventPublisher.publishApplicationStatusChanged(
                application.getId(), application.getJobPostingId(),
                application.getCandidateId(), application.getAssignedRecruiterId(),
                previousStageName, rejectedStage.name(), rejectedStage.stageType());
        auditEventPublisher.publish(actorUserId, "APPLICATION_REJECTED", "APPLICATION", application.getId(),
                "Từ chối hồ sơ: " + req.note());

        // Talent Pool: đưa ứng viên vào pool kèm tag lý do — best-effort, không chặn luồng reject chính
        try {
            candidateServiceClient.markPool(application.getCandidateId(), Map.of("tag", reasonName));
        } catch (Exception e) {
            // bỏ qua — Talent Pool là tính năng phụ trợ, không được làm fail thao tác reject
        }

        return application;
    }

    @Transactional
    public ApplicationResponse assignRecruiter(Long id, Long actorUserId, Long assignedRecruiterId) {
        Application application = findById(id);
        validateAssignedRecruiter(assignedRecruiterId);

        application.setAssignedRecruiterId(assignedRecruiterId);
        applicationRepository.save(application);

        auditEventPublisher.publish(actorUserId, "APPLICATION_RECRUITER_ASSIGNED", "APPLICATION",
                application.getId(), null);

        return buildDetailedResponse(true, application);
    }

    @Transactional
    public BulkOperationResponse bulkAdvanceStage(Long actorUserId, BulkAdvanceStageRequest req) {
        return runBulk(req.ids(), id ->
                advanceStage(id, actorUserId, new ApplicationAdvanceStageRequest(req.note())));
    }

    @Transactional
    public BulkOperationResponse bulkReject(Long actorUserId, BulkRejectRequest req) {
        return runBulk(req.ids(), id ->
                reject(id, actorUserId, new ApplicationRejectRequest(req.rejectionReasonId(), req.note())));
    }

    @Transactional
    public BulkOperationResponse bulkAssignRecruiter(Long actorUserId, BulkAssignRecruiterRequest req) {
        return runBulk(req.ids(), id -> assignRecruiter(id, actorUserId, req.assignedRecruiterId()));
    }

    /** Chạy 1 thao tác cho từng id độc lập; lỗi ở 1 id không chặn các id còn lại. */
    private BulkOperationResponse runBulk(List<Long> ids, java.util.function.Consumer<Long> action) {
        List<Long> succeeded = new java.util.ArrayList<>();
        Map<Long, String> failed = new java.util.LinkedHashMap<>();
        for (Long id : ids) {
            try {
                action.accept(id);
                succeeded.add(id);
            } catch (BusinessException e) {
                failed.put(id, e.getMessage());
            }
        }
        return new BulkOperationResponse(succeeded, failed);
    }

    @Transactional
    public void softDelete(Long id, Long actorUserId) {
        Application application = findById(id);
        if (STAGE_TYPE_HIRED.equals(application.getCurrentStageType())) {
            throw new BusinessException("Không thể xóa hồ sơ đã tuyển dụng thành công");
        }
        application.setDeletedAt(LocalDateTime.now());
        applicationRepository.save(application);
        auditEventPublisher.publish(actorUserId, "APPLICATION_DELETED", "APPLICATION", id, null);
    }

    public List<ApplicationHistoryResponse> getHistory(Long id) {
        Application application = findById(id);
        Map<Long, String> userMap = authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        // The name map only contains internal staff. The remaining actor a history row can carry is
        // the owning candidate (self-apply, offer accept/decline), so fall back to that snapshot
        // instead of exposing a candidate directory to every internal role.
        String candidateName = application.getCandidateNameSnapshot() != null
                ? application.getCandidateNameSnapshot() : "N/A";

        return historyRepository.findByApplicationIdOrderByChangedAtAsc(application.getId()).stream()
                .map(h -> new ApplicationHistoryResponse(
                        h.getId(), h.getFromStageName(), h.getToStageName(), h.getNote(),
                        h.getChangedByUserId(),
                        userMap.getOrDefault(h.getChangedByUserId(), candidateName), h.getChangedAt()))
                .toList();
    }

    public List<ApplicationCommentResponse> getComments(Long id) {
        Application application = findById(id);
        Map<Long, String> userMap = authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        return commentRepository.findByApplicationIdOrderByCreatedAtAsc(application.getId()).stream()
                .map(c -> new ApplicationCommentResponse(
                        c.getId(), c.getContent(), c.getAuthorUserId(),
                        userMap.getOrDefault(c.getAuthorUserId(), "N/A"), c.getCreatedAt()))
                .toList();
    }

    @Transactional
    public ApplicationCommentResponse addComment(Long id, Long actorUserId, String content) {
        Application application = findById(id);
        List<UserSummaryResponse> users = authServiceClient.getUsers(null);
        Map<Long, String> userMap = users.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        ApplicationComment saved = commentRepository.save(ApplicationComment.builder()
                .application(application)
                .authorUserId(actorUserId)
                .content(content)
                .build());

        // @mention: khớp theo tên đầy đủ của user trong công ty, xuất hiện dạng "@Họ Tên" trong nội dung
        String authorName = userMap.getOrDefault(actorUserId, "Người dùng");
        String excerpt = content.length() > 140 ? content.substring(0, 140) + "..." : content;
        for (UserSummaryResponse u : users) {
            if (u.id().equals(actorUserId) || u.fullName() == null) continue;
            if (content.contains("@" + u.fullName())) {
                eventPublisher.publishCommentMention(
                        application.getId(), u.id(), actorUserId, authorName, excerpt);
            }
        }

        return new ApplicationCommentResponse(saved.getId(), saved.getContent(), actorUserId, authorName, saved.getCreatedAt());
    }

    private void ensureNotTerminal(Application application) {
        if (STAGE_TYPE_HIRED.equals(application.getCurrentStageType())
                || STAGE_TYPE_REJECTED.equals(application.getCurrentStageType())) {
            throw new BusinessException("Hồ sơ đã kết thúc quy trình tuyển dụng, không thể cập nhật thêm");
        }
    }

    private CandidateSummaryResponse fetchCandidate(Long candidateId) {
        try {
            return candidateServiceClient.getCandidateSummary(candidateId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy ứng viên");
        }
    }

    private JobPostingResponse fetchPosting(Long jobPostingId) {
        try {
            return recruitmentServiceClient.getPostingById(jobPostingId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy tin tuyển dụng");
        }
    }

    private void validateRecruitmentSource(Long id) {
        boolean valid = masterDataServiceClient.getRecruitmentSources().stream().anyMatch(s -> s.id().equals(id));
        if (!valid) throw new BusinessException("Nguồn tuyển dụng không hợp lệ");
    }

    private String validateRejectionReason(Long id) {
        return masterDataServiceClient.getRejectionReasons().stream()
                .filter(r -> r.id().equals(id))
                .map(CatalogItemResponse::name)
                .findFirst()
                .orElseThrow(() -> new BusinessException("Lý do từ chối không hợp lệ"));
    }

    private void validateAssignedRecruiter(Long id) {
        boolean valid = authServiceClient.getUsers("RECRUITER").stream().anyMatch(u -> u.id().equals(id));
        if (!valid) throw new BusinessException("Người phụ trách không phải Recruiter hợp lệ");
    }

    private void saveHistory(Application application, String fromStageName, String toStageName, String note, Long actorUserId) {
        historyRepository.save(ApplicationHistory.builder()
                .application(application)
                .fromStageName(fromStageName)
                .toStageName(toStageName)
                .note(note)
                .changedByUserId(actorUserId)
                .build());
    }

    private Map<Long, String> buildMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(Collectors.toMap(
                CatalogItemResponse::id,
                CatalogItemResponse::name,
                (a, b) -> a));
    }

    private Application findById(Long id) {
        return applicationRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng tuyển"));
    }

    private CandidateApplicationResponse toCandidateResponse(
            Application application) {
        JobPostingResponse posting = safeGetPosting(application.getJobPostingId());
        Map<Long, String> reasonMap = application.getRejectionReasonId() == null
                ? Map.of()
                : buildMap(masterDataServiceClient.getRejectionReasons());
        return new CandidateApplicationResponse(
                application.getId(),
                application.getJobPostingId(),
                posting.title(),
                application.getDepartmentId(),
                posting.departmentName(),
                application.getCurrentStageName(),
                application.getCurrentStageOrder(),
                application.getCurrentStageType(),
                application.getRejectionReasonId() == null
                        ? null : reasonMap.get(application.getRejectionReasonId()),
                application.getAppliedAt(),
                application.getHiredAt());
    }

    public void requireAccess(Long id, CurrentUser actor) {
        authorizeApplication(actor, findById(id));
    }

    public Set<Long> getAccessibleCandidateIds(CurrentUser actor) {
        AuthorizationPolicy.requireInternal(actor);
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        // COMPANY_ADMIN va HR (RECRUITER) deu tiep can duoc toan bo ung vien cua cong ty.
        if (role == AuthorizationPolicy.Role.COMPANY_ADMIN
                || role == AuthorizationPolicy.Role.RECRUITER) {
            return applicationRepository.findByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                    .map(Application::getCandidateId)
                    .collect(Collectors.toSet());
        }

        Specification<Application> spec = ApplicationSpecifications.build(
                null, null, null, null, null, null, null,
                actor.departmentId(), null, true);
        return applicationRepository.findAll(spec).stream()
                .map(Application::getCandidateId)
                .collect(Collectors.toSet());
    }

    private void authorizeApplication(CurrentUser actor, Application application) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.SYSTEM) {
            return;
        }
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            Long ownCandidateId = resolveCandidateId(actor.userId());
            if (!ownCandidateId.equals(application.getCandidateId())) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Ứng viên không được truy cập hồ sơ ứng tuyển của người khác");
            }
            return;
        }

        AuthorizationPolicy.requireInternal(actor);
        AuthorizationPolicy.requireCanAccessApplication(
                actor, null, application.getDepartmentId(), application.getAssignedRecruiterId());
    }

    private Long requirePostingDepartment(JobPostingResponse posting) {
        if (posting.departmentId() == null) {
            throw new BusinessException("Tin tuyển dụng chưa được gắn phòng ban");
        }
        return posting.departmentId();
    }

    private Long resolvePipelineId(Application application) {
        if (application.getPipelineId() != null) {
            return application.getPipelineId();
        }
        return fetchPosting(application.getJobPostingId()).pipelineId();
    }

    private Long resolveCandidateId(Long userId) {
        try {
            return candidateServiceClient.getByUserId(userId).id();
        } catch (Exception exception) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng viên gắn với tài khoản");
        }
    }

}
