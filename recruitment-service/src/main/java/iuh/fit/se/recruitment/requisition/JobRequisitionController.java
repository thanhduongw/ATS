package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.common.AccessGuard;
import iuh.fit.se.recruitment.common.PageResponse;
import iuh.fit.se.recruitment.requisition.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/requisitions")
@RequiredArgsConstructor
public class JobRequisitionController {

    private final JobRequisitionService service;

    @GetMapping
    public ResponseEntity<PageResponse<JobRequisitionResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) RequisitionStatus status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean assignedToMe,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        AccessGuard.requireHrOrDepartment(role);
        return ResponseEntity.ok(service.getAll(
                tenantId, userId, role, status, departmentId, keyword, assignedToMe, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobRequisitionResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, id));
    }

    @PostMapping
    public ResponseEntity<JobRequisitionResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody JobRequisitionCreateRequest req) {
        AccessGuard.requireDepartment(role);
        return ResponseEntity.ok(service.create(tenantId, requesterId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobRequisitionResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionUpdateRequest req) {
        AccessGuard.requireDepartment(role);
        return ResponseEntity.ok(service.update(tenantId, id, requesterId, req));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<JobRequisitionResponse> submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.submit(tenantId, id, requesterId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<JobRequisitionResponse> approve(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestBody(required = false) JobRequisitionApproveRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.approve(tenantId, id, approverUserId, req));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<JobRequisitionResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionRejectRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.reject(tenantId, id, approverUserId, req));
    }

    @PostMapping("/{id}/request-changes")
    public ResponseEntity<JobRequisitionResponse> requestChanges(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionRequestChangesRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.requestChanges(tenantId, id, approverUserId, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireHr(role);
        service.softDelete(tenantId, id, actorUserId);
        return ResponseEntity.ok(Map.of("message", "Xóa yêu cầu tuyển dụng thành công"));
    }
}