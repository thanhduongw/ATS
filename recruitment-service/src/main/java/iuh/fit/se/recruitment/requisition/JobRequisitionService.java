package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.client.dto.UserSummaryResponse;
import iuh.fit.se.recruitment.common.AccessGuard;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.event.RequisitionEventPublisher;
import iuh.fit.se.recruitment.exception.BusinessException;
import iuh.fit.se.recruitment.common.PageResponse;
import iuh.fit.se.recruitment.requisition.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JobRequisitionService {

    private final JobRequisitionRepository repository;
    private final AuthServiceClient authServiceClient;
    private final RequisitionEventPublisher requisitionEventPublisher;
    private final AuditEventPublisher auditEventPublisher;

    public PageResponse<JobRequisitionResponse> getAll(
            Long tenantId, Long userId, String role,
            RequisitionStatus status, Long departmentId, String keyword, Boolean assignedToMe,
            Integer page, Integer size) {

        Long requesterId;
        if (AccessGuard.isHr(role)) {
            // HR / Company Admin: xem toàn bộ requisition của tenant
            requesterId = null;
        } else if (AccessGuard.isDepartment(role)) {
            // Phòng ban: chỉ xem yêu cầu do mình tạo
            requesterId = userId;
        } else {
            throw new AccessDeniedException("Bạn không có quyền xem danh sách yêu cầu tuyển dụng");
        }

        // "Chờ tôi duyệt": chỉ có ý nghĩa với HR (approver), thu hẹp thêm theo approverId
        Long approverId = (Boolean.TRUE.equals(assignedToMe) && AccessGuard.isHr(role)) ? userId : null;

        var spec = JobRequisitionSpecifications.build(tenantId, requesterId, approverId, status, departmentId, keyword);
        Map<Long, String> userNameMap = buildUserNameMap();

        if (page == null && size == null) {
            List<JobRequisition> all = repository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
            return PageResponse.unpaged(all.stream().map(r -> toResponse(r, userNameMap)).toList());
        }

        var pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(repository.findAll(spec, pageable).map(r -> toResponse(r, userNameMap)));
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

        if (requisition.getStatus() != RequisitionStatus.DRAFT
                && requisition.getStatus() != RequisitionStatus.CHANGES_REQUESTED) {
            throw new BusinessException("Chỉ chỉnh sửa được yêu cầu đang ở trạng thái bản nháp hoặc cần chỉnh sửa lại");
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
        // Chỉnh sửa lại sau khi HR yêu cầu chỉnh sửa -> đưa về Bản nháp, chờ phòng ban
        // gửi duyệt lại
        requisition.setStatus(RequisitionStatus.DRAFT);

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
        JobRequisition saved = repository.save(requisition);

        requisitionEventPublisher.publishSubmitted(tenantId, saved.getId(), saved.getApproverId(), saved.getTitle());

        return toResponse(saved, buildUserNameMap());
    }

    @Transactional
    public JobRequisitionResponse approve(Long tenantId, Long id, Long approverUserId,
                                          JobRequisitionApproveRequest req) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireApprover(requisition.getApproverId(), approverUserId);

        if (requisition.getStatus() != RequisitionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ phê duyệt được yêu cầu đang chờ duyệt");
        }

        // HR có thể chốt lại khoảng lương; nếu không truyền thì lấy đúng mức phòng ban
        // đã đề xuất
        BigDecimal approvedMin = (req != null && req.approvedSalaryMin() != null)
                ? req.approvedSalaryMin()
                : requisition.getExpectedSalaryMin();
        BigDecimal approvedMax = (req != null && req.approvedSalaryMax() != null)
                ? req.approvedSalaryMax()
                : requisition.getExpectedSalaryMax();

        requisition.setApprovedSalaryMin(approvedMin);
        requisition.setApprovedSalaryMax(approvedMax);
        requisition.setHrNote(req != null ? req.note() : null);
        requisition.setStatus(RequisitionStatus.APPROVED);
        JobRequisition saved = repository.save(requisition);

        auditEventPublisher.publish(tenantId, approverUserId, "REQUISITION_APPROVED", "REQUISITION", saved.getId(),
                null);

        return toResponse(saved, buildUserNameMap());
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
        JobRequisition saved = repository.save(requisition);

        auditEventPublisher.publish(tenantId, approverUserId, "REQUISITION_REJECTED", "REQUISITION", saved.getId(),
                req.reason());

        return toResponse(saved, buildUserNameMap());
    }

    /**
     * HR yêu cầu phòng ban chỉnh sửa lại yêu cầu (khác với Từ chối — đây không phải
     * quyết định cuối cùng).
     * Yêu cầu quay về trạng thái CHANGES_REQUESTED, phòng ban sửa lại (sẽ tự đưa về
     * DRAFT) rồi gửi duyệt lại.
     */
    @Transactional
    public JobRequisitionResponse requestChanges(Long tenantId, Long id, Long approverUserId,
                                                 JobRequisitionRequestChangesRequest req) {
        JobRequisition requisition = findOwned(tenantId, id);
        AccessGuard.requireApprover(requisition.getApproverId(), approverUserId);

        if (requisition.getStatus() != RequisitionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ yêu cầu chỉnh sửa được yêu cầu đang chờ duyệt");
        }

        requisition.setStatus(RequisitionStatus.CHANGES_REQUESTED);
        requisition.setHrNote(req.note());
        JobRequisition saved = repository.save(requisition);

        auditEventPublisher.publish(tenantId, approverUserId, "REQUISITION_CHANGES_REQUESTED", "REQUISITION",
                saved.getId(), req.note());

        return toResponse(saved, buildUserNameMap());
    }

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        JobRequisition requisition = findOwned(tenantId, id);
        if (requisition.getStatus() == RequisitionStatus.APPROVED) {
            throw new BusinessException("Không thể xóa yêu cầu đã được phê duyệt (đã có thể phát sinh Job Posting)");
        }
        requisition.setDeletedAt(LocalDateTime.now());
        repository.save(requisition);
        auditEventPublisher.publish(tenantId, actorUserId, "REQUISITION_DELETED", "REQUISITION", id, null);
    }

    /**
     * Theo đúng quy trình: phòng ban (Hiring Manager) tạo yêu cầu và gửi cho HR
     * (Recruiter / Company Admin) duyệt.
     * Người duyệt vì vậy phải thuộc nhóm HR, không phải Hiring Manager.
     */
    private void validateApprover(Long approverId) {
        List<UserSummaryResponse> recruiters = authServiceClient.getUsers("RECRUITER");
        List<UserSummaryResponse> companyAdmins = authServiceClient.getUsers("COMPANY_ADMIN");
        boolean valid = java.util.stream.Stream.concat(recruiters.stream(), companyAdmins.stream())
                .anyMatch(u -> u.id().equals(approverId));
        if (!valid) {
            throw new BusinessException("Người được chọn không phải là nhân sự HR hợp lệ");
        }
    }

    private Map<Long, String> buildUserNameMap() {
        return authServiceClient.getUsers(null).stream()
                .collect(java.util.stream.Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));
    }

    private JobRequisition findOwned(Long tenantId, Long id) {
        return repository.findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy yêu cầu tuyển dụng"));
    }

    private JobRequisitionResponse toResponse(JobRequisition r, Map<Long, String> userNameMap) {
        return new JobRequisitionResponse(
                r.getId(), r.getTitle(), r.getDepartmentId(), r.getJobTitleId(), r.getJobLevelId(),
                r.getQuantity(), r.getBudget(), r.getExpectedSalaryMin(), r.getExpectedSalaryMax(),
                r.getApprovedSalaryMin(), r.getApprovedSalaryMax(),
                r.getExpectedStartDate(), r.getDescription(),
                r.getRequesterId(), userNameMap.getOrDefault(r.getRequesterId(), "N/A"),
                r.getApproverId(), userNameMap.getOrDefault(r.getApproverId(), "N/A"),
                r.getStatus(), r.getRejectReason(), r.getHrNote(), r.getCreatedAt());
    }
}