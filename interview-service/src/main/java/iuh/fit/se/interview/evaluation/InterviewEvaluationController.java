package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.evaluation.dto.EvaluationDraftRequest;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
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

    /**
     * Phòng ban (interviewer được assign) nộp đánh giá + đề xuất lương.
     * HR cũng có thể nộp nếu được gán trong list interviewer.
     */
    @PostMapping
    public ResponseEntity<EvaluationResponse> submit(
            @PathVariable Long interviewId,
            @Valid @RequestBody EvaluationSubmitRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.submit(
                interviewId, actor, req));
    }

    /**
     * Lưu nháp bài chấm của chính mình. Sửa được tự do cho tới khi bấm nộp;
     * sau khi nộp thì endpoint này từ chối.
     */
    @PutMapping("/me")
    public ResponseEntity<EvaluationResponse> saveDraft(
            @PathVariable Long interviewId,
            @Valid @RequestBody EvaluationDraftRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.saveDraft(interviewId, actor, req));
    }

    /**
     * HR xem full (kèm lương đề xuất).
     * Phòng ban xem được list; lương chỉ hiện của chính mình (hoặc full nếu isHr).
     * Candidate: 403.
     */
    @GetMapping
    public ResponseEntity<List<EvaluationResponse>> getAll(
            @PathVariable Long interviewId) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getByInterview(
                interviewId, actor));
    }
}
