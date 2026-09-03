package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.common.PageResponse;
import iuh.fit.se.recruitment.requisition.dto.*;
import iuh.fit.se.recruitment.security.AuthorizationPolicy;
import iuh.fit.se.recruitment.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/requisitions")
@RequiredArgsConstructor
public class JobRequisitionController {

    private final JobRequisitionService service;

    @GetMapping
    public ResponseEntity<PageResponse<JobRequisitionResponse>> getAll(
            @RequestParam(required = false) RequisitionStatus status,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean assignedToMe,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(
                actor, status, departmentId, keyword, assignedToMe, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobRequisitionResponse> getById(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id, CurrentUser.required()));
    }

    @PostMapping
    public ResponseEntity<JobRequisitionResponse> create(
            @Valid @RequestBody JobRequisitionCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHiringManager(actor);
        AuthorizationPolicy.requireSameDepartment(actor, req.departmentId());
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobRequisitionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionUpdateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHiringManager(actor);
        AuthorizationPolicy.requireSameDepartment(actor, req.departmentId());
        return ResponseEntity.ok(service.update(id, actor, req));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<JobRequisitionResponse> submit(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHiringManager(actor);
        return ResponseEntity.ok(service.submit(id, actor));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<JobRequisitionResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) JobRequisitionApproveRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.approve(id, actor, req));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<JobRequisitionResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionRejectRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.reject(id, actor, req));
    }

    @PostMapping("/{id}/request-changes")
    public ResponseEntity<JobRequisitionResponse> requestChanges(
            @PathVariable Long id,
            @Valid @RequestBody JobRequisitionRequestChangesRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.requestChanges(id, actor, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.softDelete(id, actor);
        return ResponseEntity.ok(Map.of("message", "Xóa yêu cầu tuyển dụng thành công"));
    }
}
