package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.common.AccessGuard;
import iuh.fit.se.offer.offer.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offer/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService service;

    @GetMapping
    public ResponseEntity<List<OfferResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) Long applicationId) {
        return ResponseEntity.ok(service.getAll(tenantId, applicationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OfferResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, id));
    }

    @PostMapping
    public ResponseEntity<OfferResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody OfferCreateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.create(tenantId, requesterId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OfferResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody OfferUpdateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.update(tenantId, id, requesterId, req));
    }

    @PatchMapping("/{id}/submit")
    public ResponseEntity<OfferResponse> submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.submit(tenantId, id, requesterId));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<OfferResponse> approve(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.approve(tenantId, id, approverUserId));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<OfferResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @PathVariable Long id,
            @Valid @RequestBody OfferRejectRequest req) {
        return ResponseEntity.ok(service.reject(tenantId, id, approverUserId, req));
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<OfferResponse> accept(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader(value = "X-User-Role", defaultValue = "RECRUITER") String userRole,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.accept(tenantId, id, actorUserId, userRole));
    }

    @PatchMapping("/{id}/decline")
    public ResponseEntity<OfferResponse> decline(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader(value = "X-User-Role", defaultValue = "RECRUITER") String userRole,
            @PathVariable Long id,
            @Valid @RequestBody OfferDeclineRequest req) {
        return ResponseEntity.ok(service.decline(tenantId, id, actorUserId, userRole, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireRecruiterOrAbove(role);
        service.softDelete(tenantId, id, actorUserId);
        return ResponseEntity.ok(Map.of("message", "Xóa Offer thành công"));
    }
}
