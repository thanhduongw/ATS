package iuh.fit.se.application.application;

import iuh.fit.se.application.application.dto.*;
import iuh.fit.se.application.common.AccessGuard;
import iuh.fit.se.application.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/application/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService service;

    @GetMapping
    public ResponseEntity<PageResponse<ApplicationResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) Long jobPostingId,
            @RequestParam(required = false) Long candidateId,
            @RequestParam(required = false) Long assignedRecruiterId,
            @RequestParam(required = false) Long recruitmentSourceId,
            @RequestParam(required = false) String stageType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.ok(service.getAll(
                tenantId, userId, role, jobPostingId, candidateId,
                assignedRecruiterId, recruitmentSourceId, stageType,
                appliedFrom, appliedTo, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, userId, role, id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<ApplicationSummaryResponse> getSummaryById(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getSummaryById(tenantId, id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getHistory(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireHrOrDepartment(role);
        return ResponseEntity.ok(service.getHistory(tenantId, id));
    }

    /** Candidate self-apply hoặc HR nộp hộ. */
    @PostMapping
    public ResponseEntity<ApplicationResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody ApplicationCreateRequest req) {
        return ResponseEntity.ok(service.create(tenantId, actorUserId, role, req));
    }

    @PatchMapping("/{id}/advance-stage")
    public ResponseEntity<ApplicationResponse> advanceStage(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestBody(required = false) ApplicationAdvanceStageRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.advanceStage(
                tenantId, id, actorUserId,
                req != null ? req : new ApplicationAdvanceStageRequest(null)));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApplicationResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationRejectRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.reject(tenantId, id, actorUserId, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireHr(role);
        service.softDelete(tenantId, id, actorUserId);
        return ResponseEntity.ok(Map.of("message", "Xóa hồ sơ ứng tuyển thành công"));
    }
}