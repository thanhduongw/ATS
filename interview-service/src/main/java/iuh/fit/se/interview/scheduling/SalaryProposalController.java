package iuh.fit.se.interview.scheduling;

import iuh.fit.se.interview.scheduling.dto.SalaryProposalRequest;
import iuh.fit.se.interview.scheduling.dto.SalaryProposalResponse;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
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
            @Valid @RequestBody SalaryProposalRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.submit(actor, req));
    }

    @GetMapping
    public ResponseEntity<List<SalaryProposalResponse>> getByApplicationId(
            @RequestParam Long applicationId) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(service.getByApplicationId(applicationId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<SalaryProposalResponse> approve(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.approve(actor.userId(), actor.role(), id));
    }
}
