package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.common.PageResponse;
import iuh.fit.se.recruitment.posting.dto.*;
import iuh.fit.se.recruitment.security.AuthorizationPolicy;
import iuh.fit.se.recruitment.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService service;

    /** HR + Phòng ban: mọi status */
    @GetMapping
    public ResponseEntity<PageResponse<JobPostingResponse>> getAll(
            @RequestParam(required = false) PostingStatus status,
            @RequestParam(required = false) Long employmentTypeId,
            @RequestParam(required = false) Long workLocationId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(
                actor, status, employmentTypeId, workLocationId, keyword, page, size));
    }

    /**
     * Tin OPEN — Candidate dùng để xem & apply.
     * Khai báo TRƯỚC /{id} để không bị nuốt path "open".
     */
    @GetMapping("/open")
    public ResponseEntity<List<JobPostingResponse>> getOpen() {
        CurrentUser.required();
        return ResponseEntity.ok(service.getOpen(null, null));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> getById(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        if (AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE) {
            return ResponseEntity.ok(service.getOpenById(id));
        }
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getById(id, actor));
    }

    @PostMapping
    public ResponseEntity<JobPostingResponse> create(
            @Valid @RequestBody JobPostingCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingUpdateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.update(id, actor, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<JobPostingResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody JobPostingStatusRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.changeStatus(id, actor, req));
    }

    /** DRAFT/EDITING → APPROVED */
    @PatchMapping("/{id}/submit-review")
    public ResponseEntity<JobPostingResponse> submitReview(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.submitReview(actor, id));
    }

    /** APPROVED → EDITING */
    @PatchMapping("/{id}/request-edit")
    public ResponseEntity<JobPostingResponse> requestEdit(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.requestEdit(id, actor));
    }

    /** APPROVED → OPEN */
    @PatchMapping("/{id}/publish")
    public ResponseEntity<JobPostingResponse> publish(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.publish(actor, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.softDelete(id, actor);
        return ResponseEntity.ok(Map.of("message", "Xóa tin tuyển dụng thành công"));
    }
}
