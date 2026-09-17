package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.evaluation.dto.ApplicationEvaluationsResponse;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Doc danh gia cua nhieu ho so cung luc. Bang so sanh ung vien cua mot tin tuyen dung goi
 * mot lan thay vi goi lan luot tung ho so.
 */
@RestController
@RequestMapping("/api/interview/evaluations")
@RequiredArgsConstructor
public class BatchEvaluationController {

    private final InterviewEvaluationService service;

    @GetMapping
    public ResponseEntity<List<ApplicationEvaluationsResponse>> getByApplications(
            @RequestParam List<Long> applicationIds) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getByApplications(applicationIds, actor));
    }
}
