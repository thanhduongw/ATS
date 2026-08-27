package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.common.AccessGuard;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleItem;
import iuh.fit.se.interview.interview.dto.InterviewBulkScheduleRequest;
import iuh.fit.se.interview.interview.dto.InterviewCreateRequest;
import iuh.fit.se.interview.interview.dto.InterviewResponse;
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
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) Long applicationId,
            @RequestParam(required = false) Long jobPostingId,
            @RequestParam(required = false) Long interviewerId,
            @RequestParam(required = false) InterviewStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate) {
        return ResponseEntity.ok(service.getAll(
                tenantId, userId, role, applicationId, jobPostingId, interviewerId, status, fromDate, toDate));
    }

    /** Chỉ HR — xếp lịch hàng loạt cho nhiều hồ sơ, tự động chia khung giờ nối tiếp và tránh trùng lịch. */
    @PostMapping("/batch")
    public ResponseEntity<List<InterviewBulkScheduleItem>> bulkSchedule(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody InterviewBulkScheduleRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.bulkSchedule(tenantId, actorUserId, req));
    }

    @GetMapping("/{id}/ics")
    public ResponseEntity<byte[]> getIcs(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        String ics = service.generateIcs(tenantId, userId, role, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"interview-" + id + ".ics\"")
                .body(ics.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, userId, role, id));
    }

    /** Chỉ HR lên lịch */
    @PostMapping
    public ResponseEntity<InterviewResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody InterviewCreateRequest req) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.create(tenantId, actorUserId, req));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireHr(role);
        return ResponseEntity.ok(service.cancel(tenantId, id));
    }

    /** Candidate xác nhận lịch */
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InterviewResponse> confirm(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireCandidate(role);
        return ResponseEntity.ok(service.confirmByCandidate(tenantId, userId, id));
    }
}