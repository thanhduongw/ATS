package iuh.fit.se.candidate.application;

import iuh.fit.se.candidate.application.dto.*;
import iuh.fit.se.candidate.common.AccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService service;

    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) Long jobPostingId,
            @RequestParam(required = false) Long candidateId) {
        return ResponseEntity.ok(service.getAll(tenantId, jobPostingId, candidateId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getHistory(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getHistory(tenantId, id));
    }

    @PostMapping
    public ResponseEntity<ApplicationResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody ApplicationCreateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.create(tenantId, actorUserId, req));
    }

    @PatchMapping("/{id}/advance-stage")
    public ResponseEntity<ApplicationResponse> advanceStage(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestBody(required = false) ApplicationAdvanceStageRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        ApplicationAdvanceStageRequest body = req != null ? req : new ApplicationAdvanceStageRequest(null);
        return ResponseEntity.ok(service.advanceStage(tenantId, id, actorUserId, body));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApplicationResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationRejectRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.reject(tenantId, id, actorUserId, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireRecruiterOrAbove(role);
        service.softDelete(tenantId, id, actorUserId);
        return ResponseEntity.ok(Map.of("message", "Xóa hồ sơ ứng tuyển thành công"));
    }
}