package iuh.fit.se.candidate.offer;

import iuh.fit.se.candidate.common.AccessGuard;
import iuh.fit.se.candidate.offer.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidate/offers")
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
            @PathVariable Long id,
            @Valid @RequestBody OfferUpdateRequest req) {
        return ResponseEntity.ok(service.update(tenantId, id, requesterId, req));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<OfferResponse> submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long requesterId,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.submit(tenantId, id, requesterId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<OfferResponse> approve(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.approve(tenantId, id, approverUserId));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<OfferResponse> reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long approverUserId,
            @PathVariable Long id,
            @Valid @RequestBody OfferRejectRequest req) {
        return ResponseEntity.ok(service.reject(tenantId, id, approverUserId, req));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<OfferResponse> accept(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.accept(tenantId, id, actorUserId));
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<OfferResponse> decline(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody OfferDeclineRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.decline(tenantId, id, actorUserId, req));
    }
}