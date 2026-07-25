package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.common.AccessGuard;
import iuh.fit.se.recruitment.posting.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService service;

    @GetMapping
    public ResponseEntity<List<JobPostingResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, id));
    }

    @PostMapping
    public ResponseEntity<JobPostingResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody JobPostingCreateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobPostingUpdateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.update(tenantId, id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<JobPostingResponse> changeStatus(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobPostingStatusRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.changeStatus(tenantId, id, req));
    }
}