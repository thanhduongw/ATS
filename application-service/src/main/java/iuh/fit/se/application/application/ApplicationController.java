package iuh.fit.se.application.application;

import iuh.fit.se.application.application.dto.*;
import iuh.fit.se.application.common.PageResponse;
import iuh.fit.se.application.security.AuthorizationPolicy;
import iuh.fit.se.application.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/application/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService service;

    @GetMapping
    public ResponseEntity<PageResponse<ApplicationResponse>> getAll(
            @RequestParam(required = false) Long jobPostingId,
            @RequestParam(required = false) Long candidateId,
            @RequestParam(required = false) Long assignedRecruiterId,
            @RequestParam(required = false) Long recruitmentSourceId,
            @RequestParam(required = false) String stageType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(
                actor, jobPostingId, candidateId,
                assignedRecruiterId, recruitmentSourceId, stageType,
                appliedFrom, appliedTo, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getById(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getById(actor, id));
    }

    @GetMapping("/my")
    public ResponseEntity<List<CandidateApplicationResponse>> getMyApplications() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyApplications(actor));
    }

    @GetMapping("/my/{id}")
    public ResponseEntity<CandidateApplicationResponse> getMyApplication(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyApplication(actor, id));
    }

    @GetMapping("/access-scope/candidate-ids")
    public ResponseEntity<Set<Long>> getAccessibleCandidateIds() {
        return ResponseEntity.ok(service.getAccessibleCandidateIds(CurrentUser.required()));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<ApplicationSummaryResponse> getSummaryById(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getSummaryById(id, CurrentUser.required()));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ApplicationHistoryResponse>> getHistory(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.getHistory(id));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<ApplicationCommentResponse>> getComments(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApplicationCommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationCommentCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.addComment(id, actor.userId(), req.content()));
    }

    /** Candidate self-apply hoặc HR nộp hộ. */
    @PostMapping
    public ResponseEntity<?> create(
            @Valid @RequestBody ApplicationCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        if (AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE) {
            return ResponseEntity.ok(service.createForCandidate(actor, req));
        }
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PatchMapping("/{id}/advance-stage")
    public ResponseEntity<ApplicationResponse> advanceStage(
            @PathVariable Long id,
            @RequestBody(required = false) ApplicationAdvanceStageRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.advanceStage(
                id, actor.userId(),
                req != null ? req : new ApplicationAdvanceStageRequest(null)));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApplicationResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationRejectRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.reject(id, actor.userId(), req));
    }

    @PatchMapping("/{id}/assign-recruiter")
    public ResponseEntity<ApplicationResponse> assignRecruiter(
            @PathVariable Long id,
            @Valid @RequestBody ApplicationAssignRecruiterRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.requireAccess(id, actor);
        return ResponseEntity.ok(service.assignRecruiter(
                id, actor.userId(), req.assignedRecruiterId()));
    }

    @PatchMapping("/bulk-advance-stage")
    public ResponseEntity<BulkOperationResponse> bulkAdvanceStage(
            @Valid @RequestBody BulkAdvanceStageRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        req.ids().forEach(id -> service.requireAccess(id, actor));
        return ResponseEntity.ok(service.bulkAdvanceStage(actor.userId(), req));
    }

    @PatchMapping("/bulk-reject")
    public ResponseEntity<BulkOperationResponse> bulkReject(
            @Valid @RequestBody BulkRejectRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        req.ids().forEach(id -> service.requireAccess(id, actor));
        return ResponseEntity.ok(service.bulkReject(actor.userId(), req));
    }

    @PatchMapping("/bulk-assign-recruiter")
    public ResponseEntity<BulkOperationResponse> bulkAssignRecruiter(
            @Valid @RequestBody BulkAssignRecruiterRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        req.ids().forEach(id -> service.requireAccess(id, actor));
        return ResponseEntity.ok(service.bulkAssignRecruiter(actor.userId(), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.requireAccess(id, actor);
        service.softDelete(id, actor.userId());
        return ResponseEntity.ok(Map.of("message", "Xóa hồ sơ ứng tuyển thành công"));
    }
}
