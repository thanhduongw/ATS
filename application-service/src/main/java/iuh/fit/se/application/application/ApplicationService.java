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
import iuh.fit.se.application.event.ApplicationEventPublisher;
import iuh.fit.se.application.event.AuditEventPublisher;
import iuh.fit.se.application.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private static final String STAGE_TYPE_REJECTED = "REJECTED";
    private static final String STAGE_TYPE_HIRED = "HIRED";

    private final ApplicationRepository applicationRepository;
    private final ApplicationHistoryRepository historyRepository;
    private final CandidateServiceClient candidateServiceClient;
    private final RecruitmentServiceClient recruitmentServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditEventPublisher auditEventPublisher;

    public List<ApplicationResponse> getAll(Long tenantId, Long jobPostingId, Long candidateId) {
        List<Application> applications;
        if (jobPostingId != null) {
            applications = applicationRepository.findByTenantIdAndJobPostingIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, jobPostingId);
        } else if (candidateId != null) {
            applications = applicationRepository.findByTenantIdAndCandidateIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, candidateId);
        } else {
            applications = applicationRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId);
        }

        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources(tenantId));
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons(tenantId));
        Map<Long, String> userMap = authServiceClient.getUsers(tenantId, null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        return applications.stream().map(a -> toResponse(a, sourceMap, reasonMap, userMap)).toList();
    }

    public ApplicationResponse getById(Long tenantId, Long id) {
        Application application = findOwned(tenantId, id);
        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources(tenantId));
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons(tenantId));
        Map<Long, String> userMap = authServiceClient.getUsers(tenantId, null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));
        return toResponse(application, sourceMap, reasonMap, userMap);
    }

    public ApplicationSummaryResponse getSummaryById(Long tenantId, Long id) {
        Application application = findOwned(tenantId, id);
        return new ApplicationSummaryResponse(
                application.getId(),
                application.getCandidateId(),
                application.getCandidateNameSnapshot(),
                application.getCandidateEmailSnapshot(),
                application.getJobPostingId(),
                application.getCurrentStageOrder(),
                application.getCurrentStageType(),
                application.getCurrentStageName(),
                application.getAppliedAt()
        );
    }

    @Transactional
    public ApplicationResponse create(Long tenantId, Long actorUserId, ApplicationCreateRequest req) {
        CandidateSummaryResponse candidate = fetchCandidate(tenantId, req.candidateId());

        JobPostingResponse posting = fetchPosting(tenantId, req.jobPostingId());
        if (!"OPEN".equals(posting.status())) {
            throw new BusinessException("Chỉ ứng tuyển được vào tin tuyển dụng đang mở");
        }

        if (applicationRepository.existsByTenantIdAndCandidateIdAndJobPostingIdAndDeletedAtIsNull(tenantId, req.candidateId(), req.jobPostingId())) {
            throw new BusinessException("Ứng viên này đã nộp hồ sơ vào tin tuyển dụng này rồi");
        }

        validateRecruitmentSource(tenantId, req.recruitmentSourceId());
        if (req.assignedRecruiterId() != null) {
            validateAssignedRecruiter(tenantId, req.assignedRecruiterId());
        }

        String resumeUrl = req.resumeUrl() != null ? req.resumeUrl() : candidate.cvFileUrl();
        if (resumeUrl == null) {
            throw new BusinessException("Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển");
        }

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(tenantId, posting.pipelineId());
        PipelineStageResponse firstStage = pipeline.stages().stream()
                .min(Comparator.comparing(PipelineStageResponse::stageOrder))
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng chưa có giai đoạn nào"));

        Application application = applicationRepository.save(Application.builder()
                .tenantId(tenantId)
                .candidateId(candidate.id())
                .candidateNameSnapshot(candidate.fullName())
                .candidateEmailSnapshot(candidate.email())
                .jobPostingId(req.jobPostingId())
                .recruitmentSourceId(req.recruitmentSourceId())
                .assignedRecruiterId(req.assignedRecruiterId())
                .resumeUrl(resumeUrl)
                .currentStageId(firstStage.id())
                .currentStageName(firstStage.name())
                .currentStageOrder(firstStage.stageOrder())
                .currentStageType(firstStage.stageType())
                .note(req.note())
                .build());

        saveHistory(application, null, firstStage.name(), "Ứng tuyển vào vị trí", actorUserId);

        eventPublisher.publishApplicationCreated(
                tenantId, req.jobPostingId(), application.getId(),
                application.getCandidateId(), assignedRecruiterId, application.getCandidateNameSnapshot());

        return getById(tenantId, application.getId());
    }

    @Transactional
    public ApplicationResponse advanceStage(Long tenantId, Long id, Long actorUserId, ApplicationAdvanceStageRequest req) {
        Application application = findOwned(tenantId, id);
        ensureNotTerminal(application);

        JobPostingResponse posting = fetchPosting(tenantId, application.getJobPostingId());
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(tenantId, posting.pipelineId());

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
        applicationRepository.save(application);

        saveHistory(application, previousStageName, nextStage.name(), req.note(), actorUserId);
        eventPublisher.publishApplicationStatusChanged(
                tenantId, application.getId(), application.getJobPostingId(),
                application.getCandidateId(), application.getAssignedRecruiterId(),
                previousStageName, nextStage.getName(), nextStage.getStageType());
        auditEventPublisher.publish(tenantId, actorUserId, "APPLICATION_STAGE_CHANGED", "APPLICATION", application.getId(),
                previousStageName + " → " + nextStage.name());

        return getById(tenantId, application.getId());
    }

    @Transactional
    public ApplicationResponse reject(Long tenantId, Long id, Long actorUserId, ApplicationRejectRequest req) {
        Application application = findOwned(tenantId, id);
        ensureNotTerminal(application);

        validateRejectionReason(tenantId, req.rejectionReasonId());

        JobPostingResponse posting = fetchPosting(tenantId, application.getJobPostingId());
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(tenantId, posting.pipelineId());

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
                tenantId, application.getId(), application.getJobPostingId(),
                application.getCandidateId(), application.getAssignedRecruiterId(),
                previousStageName, rejectedStage.getName(), rejectedStage.getStageType());
        auditEventPublisher.publish(tenantId, actorUserId, "APPLICATION_REJECTED", "APPLICATION", application.getId(),
                "Từ chối hồ sơ: " + req.note());

        return getById(tenantId, application.getId());
    }

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        Application application = findOwned(tenantId, id);
        if (STAGE_TYPE_HIRED.equals(application.getCurrentStageType())) {
            throw new BusinessException("Không thể xóa hồ sơ đã tuyển dụng thành công");
        }
        application.setDeletedAt(LocalDateTime.now());
        applicationRepository.save(application);
        auditEventPublisher.publish(tenantId, actorUserId, "APPLICATION_DELETED", "APPLICATION", id, null);
    }

    public List<ApplicationHistoryResponse> getHistory(Long tenantId, Long id) {
        Application application = findOwned(tenantId, id);
        Map<Long, String> userMap = authServiceClient.getUsers(tenantId, null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));

        return historyRepository.findByApplicationIdOrderByChangedAtAsc(application.getId()).stream()
                .map(h -> new ApplicationHistoryResponse(
                        h.getId(), h.getFromStageName(), h.getToStageName(), h.getNote(),
                        h.getChangedByUserId(), userMap.getOrDefault(h.getChangedByUserId(), "N/A"), h.getChangedAt()))
                .toList();
    }

    private void ensureNotTerminal(Application application) {
        if (STAGE_TYPE_HIRED.equals(application.getCurrentStageType())
                || STAGE_TYPE_REJECTED.equals(application.getCurrentStageType())) {
            throw new BusinessException("Hồ sơ đã kết thúc quy trình tuyển dụng, không thể cập nhật thêm");
        }
    }

    private CandidateSummaryResponse fetchCandidate(Long tenantId, Long candidateId) {
        try {
            return candidateServiceClient.getCandidateSummary(tenantId, candidateId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy ứng viên");
        }
    }

    private JobPostingResponse fetchPosting(Long tenantId, Long jobPostingId) {
        try {
            return recruitmentServiceClient.getPostingById(tenantId, jobPostingId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy tin tuyển dụng");
        }
    }

    private void validateRecruitmentSource(Long tenantId, Long id) {
        boolean valid = masterDataServiceClient.getRecruitmentSources(tenantId).stream().anyMatch(s -> s.id().equals(id));
        if (!valid) throw new BusinessException("Nguồn tuyển dụng không hợp lệ");
    }

    private void validateRejectionReason(Long tenantId, Long id) {
        boolean valid = masterDataServiceClient.getRejectionReasons(tenantId).stream().anyMatch(r -> r.id().equals(id));
        if (!valid) throw new BusinessException("Lý do từ chối không hợp lệ");
    }

    private void validateAssignedRecruiter(Long tenantId, Long id) {
        boolean valid = authServiceClient.getUsers(tenantId, "RECRUITER").stream().anyMatch(u -> u.id().equals(id));
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

    private Application findOwned(Long tenantId, Long id) {
        return applicationRepository.findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng tuyển"));
    }

    private ApplicationResponse toResponse(
            Application a, Map<Long, String> sourceMap, Map<Long, String> reasonMap, Map<Long, String> userMap) {
        return new ApplicationResponse(
                a.getId(), a.getCandidateId(), a.getCandidateNameSnapshot(),
                a.getJobPostingId(), a.getRecruitmentSourceId(), sourceMap.getOrDefault(a.getRecruitmentSourceId(), "N/A"),
                a.getAssignedRecruiterId(), a.getAssignedRecruiterId() == null ? null : userMap.get(a.getAssignedRecruiterId()),
                a.getResumeUrl(), a.getCurrentStageId(), a.getCurrentStageName(), a.getCurrentStageOrder(), a.getCurrentStageType(),
                a.getRejectionReasonId(), a.getRejectionReasonId() == null ? null : reasonMap.get(a.getRejectionReasonId()),
                a.getNote(), a.getAppliedAt()
        );
    }
}
