package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService service;

    @GetMapping
    public ResponseEntity<List<InterviewResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) Long applicationId) {
        return ResponseEntity.ok(service.getAll(tenantId, userId, role, applicationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, userId, role, id));
    }

    /** Chỉ HR lên lịch */
    @PostMapping
    public ResponseEntity<InterviewResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody InterviewCreateRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.create(tenantId, actorUserId, req));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.cancel(tenantId, id));
    }

    /** Candidate xác nhận lịch */
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InterviewResponse> confirm(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireCandidate(role);
        return ResponseEntity.ok(service.confirmByCandidate(tenantId, userId, id));
    }
}