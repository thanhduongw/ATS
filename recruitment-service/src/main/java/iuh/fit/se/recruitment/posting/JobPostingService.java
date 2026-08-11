package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.MasterDataServiceClient;
import iuh.fit.se.recruitment.client.dto.CatalogItemResponse;
import iuh.fit.se.recruitment.client.dto.PipelineResponse;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.exception.BusinessException;
import iuh.fit.se.recruitment.posting.dto.*;
import iuh.fit.se.recruitment.requisition.JobRequisition;
import iuh.fit.se.recruitment.requisition.JobRequisitionRepository;
import iuh.fit.se.recruitment.requisition.RequisitionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobPostingService {

    private final JobPostingRepository repository;
    private final JobRequisitionRepository requisitionRepository;
    private final MasterDataServiceClient masterDataServiceClient;
    private final AuditEventPublisher auditEventPublisher;

    public List<JobPostingResponse> getAll(Long tenantId) {
        return repository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toResponse).toList();
    }

    public JobPostingResponse getById(Long tenantId, Long id) {
        return toResponse(findOwned(tenantId, id));
    }

    @Transactional
    public JobPostingResponse create(Long tenantId, JobPostingCreateRequest req) {
        JobRequisition requisition = requisitionRepository.findByIdAndTenantIdAndDeletedAtIsNull(req.requisitionId(), tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu tuyển dụng"));

        if (requisition.getStatus() != RequisitionStatus.APPROVED) {
            throw new BusinessException("Chỉ tạo tin tuyển dụng từ yêu cầu đã được phê duyệt");
        }

        validateEmploymentType(req.employmentTypeId());
        validateWorkLocation(req.workLocationId());
        validatePipeline(req.pipelineId());

        JobPosting saved = repository.save(JobPosting.builder()
                .tenantId(tenantId)
                .requisition(requisition)
                .title(req.title())
                .employmentTypeId(req.employmentTypeId())
                .workLocationId(req.workLocationId())
                .pipelineId(req.pipelineId())
                .salaryMin(req.salaryMin())
                .salaryMax(req.salaryMax())
                .description(req.description())
                .requirements(req.requirements())
                .benefits(req.benefits())
                .status(PostingStatus.OPEN)
                .pipelineLocked(false)
                .publishedAt(LocalDateTime.now())
                .build());

        return toResponse(saved);
    }

    @Transactional
    public JobPostingResponse update(Long tenantId, Long id, JobPostingUpdateRequest req) {
        JobPosting posting = findOwned(tenantId, id);

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
        return new JobPostingResponse(
                p.getId(), p.getRequisition().getId(), p.getTitle(),
                p.getEmploymentTypeId(), p.getWorkLocationId(), p.getPipelineId(),
                p.getSalaryMin(), p.getSalaryMax(),
                p.getDescription(), p.getRequirements(), p.getBenefits(),
                p.getStatus(), p.isPipelineLocked(), p.getPublishedAt(), p.getClosedAt()
        );
    }
}