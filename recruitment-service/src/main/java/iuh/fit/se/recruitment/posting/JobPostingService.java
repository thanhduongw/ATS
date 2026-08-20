package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.MasterDataServiceClient;
import iuh.fit.se.recruitment.client.dto.CatalogItemResponse;
import iuh.fit.se.recruitment.client.dto.PipelineResponse;
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

@Service
@RequiredArgsConstructor
public class JobPostingService {

    private final JobPostingRepository repository;
    private final JobRequisitionRepository requisitionRepository;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuditEventPublisher auditEventPublisher;

    public PageResponse<JobPostingResponse> getAll(
            Long tenantId, PostingStatus status, Long employmentTypeId, Long workLocationId,
            String keyword, Integer page, Integer size) {

        var spec = JobPostingSpecifications.build(tenantId, status, employmentTypeId, workLocationId, keyword);

        if (page == null && size == null) {
            List<JobPosting> all = repository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
            return PageResponse.unpaged(all.stream().map(this::toResponse).toList());
        }

        var pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(repository.findAll(spec, pageable).map(this::toResponse));
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
                .pipelineId(req.pipelineId())
                .salaryMin(salaryMin)
                .salaryMax(salaryMax)
                .description(description)
                .requirements(req.requirements())
                .benefits(req.benefits())
                .skillIds(skillIds)
                .status(PostingStatus.OPEN)
                .pipelineLocked(false)
                .publishedAt(LocalDateTime.now())
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
        posting.setStatus(req.status());
        if (req.status() == PostingStatus.CLOSED) {
            posting.setClosedAt(LocalDateTime.now());
        }
        return toResponse(repository.save(posting));
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
        return toResponse(p, Map.of(), Map.of());
    }

    private JobPostingResponse toResponse(JobPosting p, Map<Long, String> empMap, Map<Long, String> locMap) {
        return new JobPostingResponse(
                p.getId(), p.getRequisition().getId(), p.getTitle(),
                p.getEmploymentTypeId(), p.getWorkLocationId(), p.getPipelineId(),
                p.getSalaryMin(), p.getSalaryMax(),
                p.getDescription(), p.getRequirements(), p.getBenefits(), p.getSkillIds(),
                p.getStatus(), p.isPipelineLocked(), p.getPublishedAt(), p.getClosedAt(),
                empMap.get(p.getEmploymentTypeId()), locMap.get(p.getWorkLocationId())
        );
    }

    /** Danh sách tin OPEN cho Candidate (career portal — kèm tên loại hình/địa điểm, lọc tùy chọn). */
    public List<JobPostingResponse> getOpen(Long tenantId, Long employmentTypeId, Long workLocationId) {
        Map<Long, String> empMap = buildCatalogMap(masterDataServiceClient.getEmploymentTypes(tenantId));
        Map<Long, String> locMap = buildCatalogMap(masterDataServiceClient.getWorkLocations(tenantId));
        return repository
                .findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, PostingStatus.OPEN)
                .stream()
                .filter(p -> employmentTypeId == null || employmentTypeId.equals(p.getEmploymentTypeId()))
                .filter(p -> workLocationId == null || workLocationId.equals(p.getWorkLocationId()))
                .map(p -> toResponse(p, empMap, locMap))
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
        return toResponse(posting, empMap, locMap);
    }

    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(java.util.stream.Collectors.toMap(
                CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }
}