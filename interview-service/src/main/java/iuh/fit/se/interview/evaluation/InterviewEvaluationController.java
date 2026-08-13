package iuh.fit.se.interview.evaluation;

import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.evaluation.dto.EvaluationResponse;
import iuh.fit.se.interview.evaluation.dto.EvaluationSubmitRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long interviewId,
            @Valid @RequestBody EvaluationSubmitRequest req) {
        AccessGuard.requireHrOrDepartment(role);
        return ResponseEntity.ok(service.submit(tenantId, interviewId, actorUserId, role, req));
    }

    /**
     * HR xem full (kèm lương đề xuất).
     * Phòng ban xem được list; lương chỉ hiện của chính mình (hoặc full nếu isHr).
     * Candidate: 403.
     */
    @GetMapping
    public ResponseEntity<List<EvaluationResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long interviewId) {
        if (AccessGuard.isCandidate(role)) {
            throw new AccessDeniedException("Ứng viên không xem được đánh giá nội bộ");
        }
        AccessGuard.requireHrOrDepartment(role);
        return ResponseEntity.ok(service.getByInterview(tenantId, interviewId, userId, role));
    }
}