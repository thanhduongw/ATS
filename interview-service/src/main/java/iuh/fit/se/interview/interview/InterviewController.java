package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleItem;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleRequest;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.interview.dto.CandidateInterviewResponse;
import iuh.fit.se.interview.security.AuthorizationPolicy;
import iuh.fit.se.interview.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/interview/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService service;

    @GetMapping
    public ResponseEntity<List<InterviewResponse>> getAll(
            @RequestParam(required = false) Long applicationId,
            @RequestParam(required = false) Long jobPostingId,
            @RequestParam(required = false) Long interviewerId,
            @RequestParam(required = false) InterviewStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(
                actor, applicationId, jobPostingId, interviewerId, status, fromDate, toDate));
    }

    @GetMapping("/my")
    public ResponseEntity<List<CandidateInterviewResponse>> getMyInterviews() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyInterviews(actor));
    }

    @GetMapping("/my/{id}")
    public ResponseEntity<CandidateInterviewResponse> getMyInterview(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyInterview(actor, id));
    }

    /** Chỉ HR — xếp lịch hàng loạt cho nhiều hồ sơ, tự động chia khung giờ nối tiếp và tránh trùng lịch. */
    @PostMapping("/batch")
    public ResponseEntity<List<InterviewBulkScheduleItem>> bulkSchedule(
            @Valid @RequestBody InterviewBulkScheduleRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.bulkSchedule(actor, req));
    }

    @GetMapping("/{id}/ics")
    public ResponseEntity<byte[]> getIcs(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        String ics = service.generateIcs(actor, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"interview-" + id + ".ics\"")
                .body(ics.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> getById(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getById(actor, id));
    }

    /** Chỉ HR lên lịch */
    @PostMapping
    public ResponseEntity<InterviewResponse> create(
            @Valid @RequestBody InterviewCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(
            @PathVariable Long id) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.cancel(id));
    }

    /** Candidate xác nhận lịch */
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InterviewResponse> confirm(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.confirmByCandidate(actor.userId(), id));
    }
}
