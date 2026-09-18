package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleItem;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleRequest;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.InterviewHmRejectRequest;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewUpdateRequest;
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
        AuthorizationPolicy.requireInternalOrSystem(actor);
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

    /** Chỉ HR — dời lịch tại chỗ (giờ, thời lượng, hình thức, địa điểm). */
    @PutMapping("/{id}")
    public ResponseEntity<InterviewResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody InterviewUpdateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.update(actor, id, req));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(
            @PathVariable Long id) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.cancel(id));
    }

    /** Phòng ban chốt giờ — mốc duy nhất ứng viên được thông báo. */
    @PatchMapping("/{id}/hm-confirm")
    public ResponseEntity<InterviewResponse> confirmByHm(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.confirmByHm(actor, id));
    }

    /** Phòng ban từ chối giờ HR đặt; kèm giờ đề xuất thì chờ HR duyệt, không kèm thì hủy. */
    @PatchMapping("/{id}/hm-reject")
    public ResponseEntity<InterviewResponse> rejectByHm(
            @PathVariable Long id,
            @RequestBody InterviewHmRejectRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.rejectByHm(actor, id, req));
    }

    /** Chỉ HR — duyệt giờ phòng ban đề xuất. */
    @PatchMapping("/{id}/approve-proposal")
    public ResponseEntity<InterviewResponse> approveHmProposal(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.approveHmProposal(actor, id));
    }

    /** Ghi nhận ứng viên đã xác nhận nhưng không đến. */
    @PatchMapping("/{id}/no-show")
    public ResponseEntity<InterviewResponse> markNoShow(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.markNoShow(actor, id));
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
