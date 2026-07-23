package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.common.AccessGuard;
import iuh.fit.se.recruitment.requisition.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/requisitions")
@RequiredArgsConstructor
public class JobRequisitionController {

    private final JobRequisitionService service;

    @GetMapping
    public ResponseEntity<List<JobRequisitionResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
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
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.create(tenantId, requesterId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobRequisitionResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionUpdateRequest req) {
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
            @PathVariable Long id) {
        return ResponseEntity.ok(service.approve(tenantId, id, approverUserId));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<JobRequisitionResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionRejectRequest req) {
        return ResponseEntity.ok(service.reject(tenantId, id, approverUserId, req));
    }
}