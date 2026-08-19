package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.scheduling.dto.InterviewSlotResponse;
import iuh.fit.se.interview.scheduling.dto.SlotBatchCreateRequest;
import iuh.fit.se.interview.scheduling.dto.SlotConfirmRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview/slots")
@RequiredArgsConstructor
public class InterviewSlotController {

    private final InterviewSlotService service;

    @PostMapping("/batch")
    public ResponseEntity<List<InterviewSlotResponse>> createBatch(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody SlotBatchCreateRequest req) {
        return ResponseEntity.ok(service.createBatch(tenantId, actorUserId, role, req));
    }

    @GetMapping
    public ResponseEntity<List<InterviewSlotResponse>> getSlots(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam Long applicationId) {
        return ResponseEntity.ok(service.getSlots(tenantId, applicationId));
    }

    @GetMapping("/my-pending")
    public ResponseEntity<List<InterviewSlotResponse>> getMyPendingSlots(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {
        return ResponseEntity.ok(service.getMyPendingSlots(tenantId, userId, role));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<InterviewSlotResponse> confirmSlot(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody SlotConfirmRequest req) {
        return ResponseEntity.ok(service.confirmSlot(tenantId, userId, role, id, req));
    }

    @PostMapping("/{id}/select")
    public ResponseEntity<InterviewResponse> selectSlot(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.selectSlot(tenantId, actorUserId, role, id));
    }
}
