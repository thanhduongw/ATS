package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.client.MasterDataServiceClient;
import iuh.fit.se.recruitment.client.dto.CatalogItemResponse;
import iuh.fit.se.recruitment.client.dto.PipelineResponse;
import iuh.fit.se.recruitment.client.dto.UserSummaryResponse;
import iuh.fit.se.recruitment.common.PageResponse;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.exception.BusinessException;
import iuh.fit.se.recruitment.posting.dto.*;
import iuh.fit.se.recruitment.requisition.JobRequisition;
import iuh.fit.se.recruitment.requisition.JobRequisitionRepository;
import iuh.fit.se.recruitment.requisition.RequisitionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JobPostingService {

    /** Trạng thái trước khi đăng — không được set thẳng qua endpoint /status hậu-publish. */
    private static final Set<PostingStatus> PRE_PUBLISH_STATUSES =
            Set.of(PostingStatus.DRAFT, PostingStatus.EDITING, PostingStatus.APPROVED);

    /** Các chuyển đổi hậu-publish hợp lệ cho endpoint /status. */
    private static final Map<PostingStatus, Set<PostingStatus>> POST_PUBLISH_TRANSITIONS = Map.of(
            PostingStatus.OPEN, Set.of(PostingStatus.PAUSED, PostingStatus.CLOSED),
            PostingStatus.PAUSED, Set.of(PostingStatus.OPEN, PostingStatus.CLOSED),
            PostingStatus.CLOSED, Set.of()
    );

    private final JobPostingRepository repository;
    private final JobRequisitionRepository requisitionRepository;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuthServiceClient authServiceClient;
    private final AuditEventPublisher auditEventPublisher;

    public PageResponse<JobPostingResponse> getAll(
            Long tenantId, PostingStatus status, Long employmentTypeId, Long workLocationId,
            String keyword, Integer page, Integer size) {

        var spec = JobPostingSpecifications.build(tenantId, status, employmentTypeId, workLocationId, keyword);
        Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments(tenantId));
        Map<Long, String> userNameMap = buildUserNameMap();

        if (page == null && size == null) {
            List<JobPosting> all = repository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
            return PageResponse.unpaged(all.stream().map(p -> toResponse(p, Map.of(), Map.of(), deptMap, userNameMap)).toList());
        }

        var pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(repository.findAll(spec, pageable).map(p -> toResponse(p, Map.of(), Map.of(), deptMap, userNameMap)));
    }

    public JobPostingResponse getById(Long tenantId, Long id) {
        return toResponse(findOwned(tenantId, id));
    }

    @Transactional
    public JobPostingResponse create(Long tenantId, Long actorUserId, JobPostingCreateRequest req) {
        JobRequisition requisition = requisitionRepository
                .findByIdAndTenantIdAndDeletedAtIsNull(req.requisitionId(), tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu tuyển dụng"));

        if (requisition.getStatus() != RequisitionStatus.APPROVED) {
            throw new BusinessException("Chỉ tạo tin tuyển dụng từ yêu cầu đã được phê duyệt");
        }

        // Một requisition chỉ một tin đang hiệu lực (không bị soft-delete)
        if (repository.existsByTenantIdAndRequisition_IdAndDeletedAtIsNull(tenantId, requisition.getId())) {
            throw new BusinessException("Yêu cầu tuyển dụng này đã có tin đăng. Hãy sửa tin hiện có hoặc đóng tin cũ trước.");
        }

        validateEmploymentType(req.employmentTypeId());
        validateWorkLocation(req.workLocationId());
        validatePipeline(req.pipelineId());

        // Prefill lương: ưu tiên body FE; nếu null → lấy approved* từ requisition; nếu vẫn null → expected*
        BigDecimal salaryMin = req.salaryMin() != null
                ? req.salaryMin()
                : (requisition.getApprovedSalaryMin() != null
                ? requisition.getApprovedSalaryMin()
                : requisition.getExpectedSalaryMin());
        BigDecimal salaryMax = req.salaryMax() != null
                ? req.salaryMax()
                : (requisition.getApprovedSalaryMax() != null
                ? requisition.getApprovedSalaryMax()
                : requisition.getExpectedSalaryMax());

        // Prefill mô tả / tiêu đề nếu FE để trống
        String description = (req.description() != null && !req.description().isBlank())
                ? req.description()
                : requisition.getDescription();
        String title = (req.title() != null && !req.title().isBlank())
                ? req.title()
                : requisition.getTitle();
        List<Long> skillIds = (req.skillIds() != null && !req.skillIds().isEmpty())
                ? new java.util.ArrayList<>(req.skillIds())
                : new java.util.ArrayList<>(requisition.getSkillIds());

        JobPosting saved = repository.save(JobPosting.builder()
                .tenantId(tenantId)
                .requisition(requisition)
                .title(title)
                .employmentTypeId(req.employmentTypeId())
                .workLocationId(req.workLocationId())
                .workArrangement(req.workArrangement())
                .experienceRequired(req.experienceRequired())
                .pipelineId(req.pipelineId())
                .salaryMin(salaryMin)
                .salaryMax(salaryMax)
                .description(description)
                .requirements(req.requirements())
                .benefits(req.benefits())
                .skillIds(skillIds)
                .status(PostingStatus.DRAFT)
                .pipelineLocked(false)
                .build());

        auditEventPublisher.publish(
                tenantId, actorUserId, "POSTING_CREATED", "JOB_POSTING", saved.getId(), null);

        return toResponse(saved);
    }

    @Transactional
    public JobPostingResponse update(Long tenantId, Long id, JobPostingUpdateRequest req) {
        JobPosting posting = findOwned(tenantId, id);

        if (posting.getStatus() == PostingStatus.CLOSED) {
            throw new BusinessException("Không thể sửa tin đã đóng");
        }

        validateEmploymentType(req.employmentTypeId());
        validateWorkLocation(req.workLocationId());

        posting.setTitle(req.title());
        posting.setEmploymentTypeId(req.employmentTypeId());
        posting.setWorkLocationId(req.workLocationId());
        posting.setWorkArrangement(req.workArrangement());
        posting.setExperienceRequired(req.experienceRequired());
        posting.setSalaryMin(req.salaryMin());
        posting.setSalaryMax(req.salaryMax());
        posting.setDescription(req.description());
        posting.setRequirements(req.requirements());
        posting.setBenefits(req.benefits());
        posting.setSkillIds(req.skillIds() != null ? new java.util.ArrayList<>(req.skillIds()) : new java.util.ArrayList<>());

        return toResponse(repository.save(posting));
    }

    @Transactional
    public JobPostingResponse changeStatus(Long tenantId, Long id, JobPostingStatusRequest req) {
        JobPosting posting = findOwned(tenantId, id);

        if (PRE_PUBLISH_STATUSES.contains(req.status())) {
            throw new BusinessException(
                    "Không thể chuyển thẳng về trạng thái này — dùng luồng Gửi duyệt / Sửa lại / Đăng tin");
        }
        if (PRE_PUBLISH_STATUSES.contains(posting.getStatus())) {
            throw new BusinessException("Tin chưa được đăng — hãy Gửi duyệt và Đăng tin trước");
        }
        if (!POST_PUBLISH_TRANSITIONS.getOrDefault(posting.getStatus(), Set.of()).contains(req.status())) {
            throw new BusinessException("Không thể chuyển từ trạng thái hiện tại sang trạng thái này");
        }

        posting.setStatus(req.status());
        if (req.status() == PostingStatus.CLOSED) {
            posting.setClosedAt(LocalDateTime.now());
        }
        return toResponse(repository.save(posting));
    }

    /** DRAFT/EDITING → APPROVED. HR tự xác nhận nội dung đã sẵn sàng (không có role duyệt thứ 2). */
    @Transactional
    public JobPostingResponse submitReview(Long tenantId, Long actorUserId, Long id) {
        JobPosting posting = findOwned(tenantId, id);
        if (posting.getStatus() != PostingStatus.DRAFT && posting.getStatus() != PostingStatus.EDITING) {
            throw new BusinessException("Chỉ gửi duyệt được tin đang ở trạng thái Bản nháp hoặc Đang chỉnh sửa");
        }
        validateReadyForApproval(posting);

        LocalDateTime now = LocalDateTime.now();
        posting.setSubmittedAt(now);
        posting.setApprovedAt(now);
        posting.setApprovedBy(actorUserId);
        posting.setStatus(PostingStatus.APPROVED);
        return toResponse(repository.save(posting));
    }

    /** APPROVED → EDITING. HR tự thu hồi tin đã duyệt để sửa tiếp trước khi đăng. */
    @Transactional
    public JobPostingResponse requestEdit(Long tenantId, Long id) {
        JobPosting posting = findOwned(tenantId, id);
        if (posting.getStatus() != PostingStatus.APPROVED) {
            throw new BusinessException("Chỉ sửa lại được tin đang ở trạng thái Đã duyệt");
        }
        posting.setStatus(PostingStatus.EDITING);
        return toResponse(repository.save(posting));
    }

    /** APPROVED → OPEN (đăng công khai). */
    @Transactional
    public JobPostingResponse publish(Long tenantId, Long actorUserId, Long id) {
        JobPosting posting = findOwned(tenantId, id);
        if (posting.getStatus() != PostingStatus.APPROVED) {
            throw new BusinessException("Chỉ đăng được tin đang ở trạng thái Đã duyệt");
        }
        posting.setStatus(PostingStatus.OPEN);
        posting.setPublishedAt(LocalDateTime.now());
        JobPosting saved = repository.save(posting);

        auditEventPublisher.publish(tenantId, actorUserId, "POSTING_PUBLISHED", "JOB_POSTING", saved.getId(), null);

        return toResponse(saved);
    }

    private void validateReadyForApproval(JobPosting posting) {
        if (posting.getTitle() == null || posting.getTitle().isBlank()
                || posting.getDescription() == null || posting.getDescription().isBlank()
                || posting.getRequirements() == null || posting.getRequirements().isBlank()
                || posting.getEmploymentTypeId() == null
                || posting.getWorkLocationId() == null
                || posting.getPipelineId() == null) {
            throw new BusinessException(
                    "Tin tuyển dụng chưa đủ thông tin bắt buộc (tiêu đề, mô tả, yêu cầu, loại hình, địa điểm, quy trình)");
        }
    }

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        JobPosting posting = findOwned(tenantId, id);
        if (posting.isPipelineLocked()) {
            throw new BusinessException("Không thể xóa tin tuyển dụng đã có ứng viên nộp hồ sơ");
        }
        posting.setDeletedAt(LocalDateTime.now());
        repository.save(posting);
        auditEventPublisher.publish(tenantId, actorUserId, "JOB_POSTING_DELETED", "JOB_POSTING", id, null);
    }

    private void validateEmploymentType(Long id) {
        boolean valid = masterDataServiceClient.getEmploymentTypes().stream()
                .anyMatch(e -> e.id().equals(id) && e.active());
        if (!valid) throw new BusinessException("Loại hình làm việc không hợp lệ");
    }

    private void validateWorkLocation(Long id) {
        boolean valid = masterDataServiceClient.getWorkLocations().stream()
                .anyMatch(w -> w.id().equals(id) && w.active());
        if (!valid) throw new BusinessException("Địa điểm làm việc không hợp lệ");
    }

    private void validatePipeline(Long id) {
        PipelineResponse pipeline = masterDataServiceClient.getPipelineById(id);
        if (pipeline == null || !pipeline.active()) {
            throw new BusinessException("Quy trình tuyển dụng không hợp lệ hoặc đã bị ẩn");
        }
    }

    private JobPosting findOwned(Long tenantId, Long id) {
        return repository.findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tin tuyển dụng"));
    }

    private JobPostingResponse toResponse(JobPosting p) {
        Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments(p.getTenantId()));
        return toResponse(p, Map.of(), Map.of(), deptMap, buildUserNameMap());
    }

    private JobPostingResponse toResponse(
            JobPosting p, Map<Long, String> empMap, Map<Long, String> locMap,
            Map<Long, String> deptMap, Map<Long, String> userNameMap) {
        Long departmentId = p.getRequisition().getDepartmentId();
        return new JobPostingResponse(
                p.getId(), p.getRequisition().getId(), p.getTitle(),
                p.getEmploymentTypeId(), p.getWorkLocationId(), p.getWorkArrangement(), p.getExperienceRequired(),
                p.getPipelineId(),
                p.getSalaryMin(), p.getSalaryMax(),
                p.getDescription(), p.getRequirements(), p.getBenefits(), p.getSkillIds(),
                p.getStatus(), p.isPipelineLocked(), p.getCreatedAt(),
                p.getSubmittedAt(), p.getApprovedAt(), p.getApprovedBy(),
                p.getApprovedBy() != null ? userNameMap.get(p.getApprovedBy()) : null,
                p.getPublishedAt(), p.getClosedAt(),
                empMap.get(p.getEmploymentTypeId()), locMap.get(p.getWorkLocationId()),
                departmentId, deptMap.get(departmentId)
        );
    }

    private Map<Long, String> buildUserNameMap() {
        return authServiceClient.getUsers(null).stream()
                .collect(java.util.stream.Collectors.toMap(
                        UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));
    }

    /** Danh sách tin OPEN cho Candidate (career portal — kèm tên loại hình/địa điểm, lọc tùy chọn). */
    public List<JobPostingResponse> getOpen(Long tenantId, Long employmentTypeId, Long workLocationId) {
        Map<Long, String> empMap = buildCatalogMap(masterDataServiceClient.getEmploymentTypes(tenantId));
        Map<Long, String> locMap = buildCatalogMap(masterDataServiceClient.getWorkLocations(tenantId));
        Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments(tenantId));
        return repository
                .findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, PostingStatus.OPEN)
                .stream()
                .filter(p -> employmentTypeId == null || employmentTypeId.equals(p.getEmploymentTypeId()))
                .filter(p -> workLocationId == null || workLocationId.equals(p.getWorkLocationId()))
                .map(p -> toResponse(p, empMap, locMap, deptMap, Map.of()))
                .toList();
    }

    /** Candidate xem chi tiết — chỉ khi OPEN. */
    public JobPostingResponse getOpenById(Long tenantId, Long id) {
        JobPosting posting = findOwned(tenantId, id);
        if (posting.getStatus() != PostingStatus.OPEN) {
            throw new BusinessException("Tin tuyển dụng không còn mở hoặc không tồn tại");
        }
        Map<Long, String> empMap = buildCatalogMap(masterDataServiceClient.getEmploymentTypes(tenantId));
        Map<Long, String> locMap = buildCatalogMap(masterDataServiceClient.getWorkLocations(tenantId));
        Map<Long, String> deptMap = buildCatalogMap(masterDataServiceClient.getDepartments(tenantId));
        return toResponse(posting, empMap, locMap, deptMap, Map.of());
    }

    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(java.util.stream.Collectors.toMap(
                CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }
}