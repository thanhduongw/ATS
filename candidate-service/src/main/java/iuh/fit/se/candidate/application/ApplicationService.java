package iuh.fit.se.candidate.application;

import iuh.fit.se.candidate.application.dto.*;
import iuh.fit.se.candidate.candidate.Candidate;
import iuh.fit.se.candidate.candidate.CandidateRepository;
import iuh.fit.se.candidate.client.AuthServiceClient;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.RecruitmentServiceClient;
import iuh.fit.se.candidate.client.dto.JobPostingResponse;
import iuh.fit.se.candidate.client.dto.PipelineResponse;
import iuh.fit.se.candidate.client.dto.PipelineStageResponse;
import iuh.fit.se.candidate.client.dto.UserSummaryResponse;
import iuh.fit.se.candidate.event.CandidateEventPublisher;
import iuh.fit.se.candidate.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final CandidateRepository candidateRepository;
    private final RecruitmentServiceClient recruitmentServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final CandidateEventPublisher eventPublisher;

    public List<ApplicationResponse> getAll(Long tenantId, Long jobPostingId, Long candidateId) {
        List<Application> applications;
        if (jobPostingId != null) {
            applications = applicationRepository.findByTenantIdAndJobPostingIdOrderByCreatedAtDesc(tenantId, jobPostingId);
        } else if (candidateId != null) {
            applications = applicationRepository.findByTenantIdAndCandidateIdOrderByCreatedAtDesc(tenantId, candidateId);
        } else {
            applications = applicationRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        }

        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources());
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons());
        Map<Long, String> userMap = authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));

        return applications.stream().map(a -> toResponse(a, sourceMap, reasonMap, userMap)).toList();
    }

    public ApplicationResponse getById(Long tenantId, Long id) {
        Application application = findOwned(tenantId, id);
        Map<Long, String> sourceMap = buildMap(masterDataServiceClient.getRecruitmentSources());
        Map<Long, String> reasonMap = buildMap(masterDataServiceClient.getRejectionReasons());
        Map<Long, String> userMap = authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));
        return toResponse(application, sourceMap, reasonMap, userMap);
    }

    @Transactional
    public ApplicationResponse create(Long tenantId, Long actorUserId, ApplicationCreateRequest req) {
        Candidate candidate = candidateRepository.findByIdAndTenantId(req.candidateId(), tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));

        JobPostingResponse posting = fetchPosting(req.jobPostingId());
        if (!"OPEN".equals(posting.status())) {
            throw new BusinessException("Chỉ ứng tuyển được vào tin tuyển dụng đang mở");
        }

        validateRecruitmentSource(req.recruitmentSourceId());
        if (req.assignedRecruiterId() != null) {
            validateAssignedRecruiter(req.assignedRecruiterId());
        }

        String resumeUrl = req.resumeUrl() != null ? req.resumeUrl() : candidate.getCvFileUrl();
        if (resumeUrl == null) {
            throw new BusinessException("Ứng viên chưa có CV, vui lòng tải CV lên trước khi ứng tuyển");
        }

        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(posting.pipelineId());
        PipelineStageResponse firstStage = pipeline.stages().stream()
                .min(Comparator.comparing(PipelineStageResponse::stageOrder))
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng chưa có giai đoạn nào"));

        Application application = applicationRepository.save(Application.builder()
                .tenantId(tenantId)
                .candidate(candidate)
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

        eventPublisher.publishApplicationCreated(req.jobPostingId(), application.getId());

        return getById(tenantId, application.getId());
    }

    @Transactional
    public ApplicationResponse advanceStage(Long tenantId, Long id, Long actorUserId, ApplicationAdvanceStageRequest req) {
        Application application = findOwned(tenantId, id);
        ensureNotTerminal(application);

        JobPostingResponse posting = fetchPosting(application.getJobPostingId());
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(posting.pipelineId());

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
        eventPublisher.publishApplicationStatusChanged(application.getId(), application.getJobPostingId(), previousStageName, nextStage.name());

        return getById(tenantId, id);
    }

    @Transactional
    public ApplicationResponse reject(Long tenantId, Long id, Long actorUserId, ApplicationRejectRequest req) {
        Application application = findOwned(tenantId, id);
        ensureNotTerminal(application);

        validateRejectionReason(req.rejectionReasonId());

        JobPostingResponse posting = fetchPosting(application.getJobPostingId());
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(posting.pipelineId());

        PipelineStageResponse rejectedStage = pipeline.stages().stream()
                .filter(s -> STAGE_TYPE_REJECTED.equals(s.stageType()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Quy trình tuyển dụng chưa cấu hình giai đoạn Từ chối"));

        String previousStageName = application.getCurrentStageName();

        application.setCurrentStageId(rejectedStage.id());
        application.setCurrentStageName(rejectedStage.name());
        application.setCurrentStageOrder(rejectedStage.stageOrder());
        application.setCurrentStageType(rejectedStage.stageType());
        application.setRejectionReasonId(req.rejectionReasonId());
        applicationRepository.save(application);

        saveHistory(application, previousStageName, rejectedStage.name(), req.note(), actorUserId);
        eventPublisher.publishApplicationStatusChanged(application.getId(), application.getJobPostingId(), previousStageName, rejectedStage.name());

        return getById(tenantId, id);
    }

    public List<ApplicationHistoryResponse> getHistory(Long tenantId, Long id) {
        Application application = findOwned(tenantId, id);
        Map<Long, String> userMap = authServiceClient.getUsers(null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));

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

    private void validateRejectionReason(Long id) {
        boolean valid = masterDataServiceClient.getRejectionReasons().stream().anyMatch(r -> r.id().equals(id));
        if (!valid) throw new BusinessException("Lý do từ chối không hợp lệ");
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

    private Map<Long, String> buildMap(List<iuh.fit.se.candidate.client.dto.CatalogItemResponse> items) {
        return items.stream().collect(Collectors.toMap(
                iuh.fit.se.candidate.client.dto.CatalogItemResponse::id,
                iuh.fit.se.candidate.client.dto.CatalogItemResponse::name));
    }

    private Application findOwned(Long tenantId, Long id) {
        return applicationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng tuyển"));
    }

    private ApplicationResponse toResponse(
            Application a, Map<Long, String> sourceMap, Map<Long, String> reasonMap, Map<Long, String> userMap) {
        return new ApplicationResponse(
                a.getId(), a.getCandidate().getId(), a.getCandidate().getFullName(),
                a.getJobPostingId(), a.getRecruitmentSourceId(), sourceMap.getOrDefault(a.getRecruitmentSourceId(), "N/A"),
                a.getAssignedRecruiterId(), a.getAssignedRecruiterId() == null ? null : userMap.get(a.getAssignedRecruiterId()),
                a.getResumeUrl(), a.getCurrentStageId(), a.getCurrentStageName(), a.getCurrentStageOrder(), a.getCurrentStageType(),
                a.getRejectionReasonId(), a.getRejectionReasonId() == null ? null : reasonMap.get(a.getRejectionReasonId()),
                a.getNote(), a.getAppliedAt()
        );
    }
}