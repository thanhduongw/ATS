package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview/interviews/{interviewId}/evaluations")
@RequiredArgsConstructor
public class InterviewEvaluationController {

    private final InterviewEvaluationService service;

    @PostMapping
    public ResponseEntity<EvaluationResponse> submit(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @PathVariable Long interviewId,
            @Valid @RequestBody EvaluationSubmitRequest req) {
        return ResponseEntity.ok(service.submit(tenantId, interviewId, actorUserId, req));
    }

    @GetMapping
    public ResponseEntity<List<EvaluationResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long interviewId) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.getByInterview(tenantId, interviewId));
    }
}