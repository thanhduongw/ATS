package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.scheduling.dto.SalaryProposalRequest;
import iuh.fit.se.interview.scheduling.dto.SalaryProposalResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview/salary-proposals")
@RequiredArgsConstructor
public class SalaryProposalController {

    private final SalaryProposalService service;

    @PostMapping
    public ResponseEntity<SalaryProposalResponse> submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @Valid @RequestBody SalaryProposalRequest req) {
        return ResponseEntity.ok(service.submit(tenantId, actorUserId, req));
    }

    @GetMapping
    public ResponseEntity<List<SalaryProposalResponse>> getByApplicationId(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam Long applicationId) {
        return ResponseEntity.ok(service.getByApplicationId(tenantId, applicationId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<SalaryProposalResponse> approve(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.approve(tenantId, actorUserId, role, id));
    }
}
