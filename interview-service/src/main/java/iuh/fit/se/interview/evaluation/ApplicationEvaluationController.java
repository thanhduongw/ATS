package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Danh gia o cap ho so ung tuyen: gom ca bai cham theo buoi phong van lan bai HR
 * cham cho nhung vong khong co phong van.
 */
@RestController
@RequestMapping("/api/interview/applications/{applicationId}/evaluations")
@RequiredArgsConstructor
public class ApplicationEvaluationController {

    private final InterviewEvaluationService service;

    /** HR cham danh gia cho vong hien tai cua ho so, khong can buoi phong van. */
    @PostMapping
    public ResponseEntity<EvaluationResponse> submit(
            @PathVariable Long applicationId,
            @Valid @RequestBody EvaluationSubmitRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.submitForApplication(applicationId, actor, req));
    }

    /** Toan bo danh gia cua ho so, da ap dung quy tac che noi dung. */
    @GetMapping
    public ResponseEntity<List<EvaluationResponse>> getAll(@PathVariable Long applicationId) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getByApplication(applicationId, actor));
    }
}
