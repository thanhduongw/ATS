package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
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
            @Valid @RequestBody SlotBatchCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.createBatch(
                actor.userId(), actor.role(), req));
    }

    @GetMapping
    public ResponseEntity<List<InterviewSlotResponse>> getSlots(
            @RequestParam Long applicationId) {
        service.requireApplicationAccess(applicationId);
        return ResponseEntity.ok(service.getSlots(applicationId));
    }

    @GetMapping("/my-pending")
    public ResponseEntity<List<InterviewSlotResponse>> getMyPendingSlots() {
        CurrentUser actor = CurrentUser.required();
        return ResponseEntity.ok(service.getMyPendingSlots(
                actor.userId(), actor.role()));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<InterviewSlotResponse> confirmSlot(
            @PathVariable Long id,
            @Valid @RequestBody SlotConfirmRequest req) {
        CurrentUser actor = CurrentUser.required();
        return ResponseEntity.ok(service.confirmSlot(
                actor.userId(), actor.role(), id, req));
    }

    @PostMapping("/{id}/select")
    public ResponseEntity<InterviewResponse> selectSlot(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.selectSlot(
                actor.userId(), actor.role(), id));
    }
}
