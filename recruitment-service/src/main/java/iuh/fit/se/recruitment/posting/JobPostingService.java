package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.MasterDataServiceClient;
import iuh.fit.se.recruitment.client.dto.CatalogItemResponse;
import iuh.fit.se.recruitment.client.dto.PipelineResponse;
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

    public List<JobPostingResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().map(this::toResponse).toList();
    }

    public JobPostingResponse getById(Long tenantId, Long id) {
        return toResponse(findOwned(tenantId, id));
    }

    @Transactional
    public JobPostingResponse create(Long tenantId, JobPostingCreateRequest req) {
        JobRequisition requisition = requisitionRepository.findByIdAndTenantId(req.requisitionId(), tenantId)
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

        if (posting.isPipelineLocked() && !posting.getPipelineId().equals(req.pipelineId())) {
            throw new BusinessException("Không thể đổi quy trình tuyển dụng sau khi đã có ứng viên nộp hồ sơ");
        }

        validateEmploymentType(req.employmentTypeId());
        validateWorkLocation(req.workLocationId());
        validatePipeline(req.pipelineId());

        posting.setTitle(req.title());
        posting.setEmploymentTypeId(req.employmentTypeId());
        posting.setWorkLocationId(req.workLocationId());
        posting.setPipelineId(req.pipelineId());
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
        return repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tin tuyển dụng"));
    }

    private JobPostingResponse toResponse(JobPosting p) {
        return new JobPostingResponse(
                p.getId(), p.getRequisition().getId(), p.getTitle(),
                p.getEmploymentTypeId(), p.getWorkLocationId(), p.getPipelineId(),
                p.getDescription(), p.getRequirements(), p.getBenefits(),
                p.getStatus(), p.isPipelineLocked(), p.getPublishedAt(), p.getClosedAt()
        );
    }
}