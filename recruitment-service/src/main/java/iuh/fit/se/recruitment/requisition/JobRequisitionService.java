package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.client.dto.UserSummaryResponse;
import iuh.fit.se.recruitment.common.AccessGuard;
import iuh.fit.se.recruitment.exception.BusinessException;
import iuh.fit.se.recruitment.requisition.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class JobRequisitionService {

    private final JobRequisitionRepository repository;
    private final AuthServiceClient authServiceClient;

    public List<JobRequisitionResponse> getAll(Long tenantId) {
        List<JobRequisition> requisitions = repository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        Map<Long, String> userNameMap = buildUserNameMap();
        return requisitions.stream().map(r -> toResponse(r, userNameMap)).toList();
    }

    public JobRequisitionResponse getById(Long tenantId, Long id) {
        JobRequisition requisition = findOwned(tenantId, id);
        return toResponse(requisition, buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse create(Long tenantId, Long requesterId, JobRequisitionCreateRequest req) {
        validateApprover(req.approverId());

        JobRequisition saved = repository.save(JobRequisition.builder()
                .tenantId(tenantId)
                .title(req.title())
                .departmentId(req.departmentId())
                .jobTitleId(req.jobTitleId())
                .jobLevelId(req.jobLevelId())
                .quantity(req.quantity())
                .budget(req.budget())
                .expectedSalaryMin(req.expectedSalaryMin())
                .expectedSalaryMax(req.expectedSalaryMax())
                .expectedStartDate(req.expectedStartDate())
                .description(req.description())
                .requesterId(requesterId)
                .approverId(req.approverId())
                .status(RequisitionStatus.DRAFT)
                .build());

        return toResponse(saved, buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse update(Long tenantId, Long id, Long requesterId, JobRequisitionUpdateRequest req) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireOwner(requisition.getRequesterId(), requesterId);

        if (requisition.getStatus() != RequisitionStatus.DRAFT) {
            throw new BusinessException("Chỉ chỉnh sửa được yêu cầu tuyển dụng ở trạng thái bản nháp");
        }

        validateApprover(req.approverId());

        requisition.setTitle(req.title());
        requisition.setDepartmentId(req.departmentId());
        requisition.setJobTitleId(req.jobTitleId());
        requisition.setJobLevelId(req.jobLevelId());
        requisition.setQuantity(req.quantity());
        requisition.setBudget(req.budget());
        requisition.setExpectedSalaryMin(req.expectedSalaryMin());
        requisition.setExpectedSalaryMax(req.expectedSalaryMax());
        requisition.setExpectedStartDate(req.expectedStartDate());
        requisition.setDescription(req.description());
        requisition.setApproverId(req.approverId());

        return toResponse(repository.save(requisition), buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse submit(Long tenantId, Long id, Long requesterId) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireOwner(requisition.getRequesterId(), requesterId);

        if (requisition.getStatus() != RequisitionStatus.DRAFT) {
            throw new BusinessException("Chỉ gửi duyệt được yêu cầu đang ở trạng thái bản nháp");
        }

        requisition.setStatus(RequisitionStatus.PENDING_APPROVAL);
        return toResponse(repository.save(requisition), buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse approve(Long tenantId, Long id, Long approverUserId) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireApprover(requisition.getApproverId(), approverUserId);

        if (requisition.getStatus() != RequisitionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ phê duyệt được yêu cầu đang chờ duyệt");
        }

        requisition.setStatus(RequisitionStatus.APPROVED);
        return toResponse(repository.save(requisition), buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse reject(Long tenantId, Long id, Long approverUserId, JobRequisitionRejectRequest req) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireApprover(requisition.getApproverId(), approverUserId);

        if (requisition.getStatus() != RequisitionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ từ chối được yêu cầu đang chờ duyệt");
        }

        requisition.setStatus(RequisitionStatus.REJECTED);
        requisition.setRejectReason(req.reason());
        return toResponse(repository.save(requisition), buildUserNameMap());
    }

    private void validateApprover(Long approverId) {
        List<UserSummaryResponse> hiringManagers = authServiceClient.getUsers("HIRING_MANAGER");
        boolean valid = hiringManagers.stream().anyMatch(u -> u.id().equals(approverId));
        if (!valid) {
            throw new BusinessException("Người được chọn không phải là Hiring Manager hợp lệ");
        }
    }

    private Map<Long, String> buildUserNameMap() {
        return authServiceClient.getUsers(null).stream()
                .collect(java.util.stream.Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));
    }

    private JobRequisition findOwned(Long tenantId, Long id) {
        return repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu tuyển dụng"));
    }

    private JobRequisitionResponse toResponse(JobRequisition r, Map<Long, String> userNameMap) {
        return new JobRequisitionResponse(
                r.getId(), r.getTitle(), r.getDepartmentId(), r.getJobTitleId(), r.getJobLevelId(),
                r.getQuantity(), r.getBudget(), r.getExpectedSalaryMin(), r.getExpectedSalaryMax(),
                r.getExpectedStartDate(), r.getDescription(),
                r.getRequesterId(), userNameMap.getOrDefault(r.getRequesterId(), "N/A"),
                r.getApproverId(), userNameMap.getOrDefault(r.getApproverId(), "N/A"),
                r.getStatus(), r.getRejectReason(), r.getCreatedAt()
        );
    }
}