package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateCreateRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateUpdateRequest;
import iuh.fit.se.candidate.common.AccessGuard;
import iuh.fit.se.candidate.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService service;

    @GetMapping
    public ResponseEntity<PageResponse<CandidateResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) PoolStatus poolStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.ok(service.getAll(tenantId, keyword, hasCv, poolStatus, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CandidateResponse> getById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getById(tenantId, id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse> getSummaryById(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable Long id) {
        return ResponseEntity.ok(service.getSummaryById(tenantId, id));
    }

    @PostMapping
    public ResponseEntity<CandidateResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody CandidateCreateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CandidateResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody CandidateUpdateRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.update(tenantId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireRecruiterOrAbove(role);
        service.softDelete(tenantId, id, actorUserId);
        return ResponseEntity.ok(Map.of("message", "Xóa ứng viên thành công"));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<iuh.fit.se.candidate.candidate.dto.BulkOperationResponse> bulkDelete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody iuh.fit.se.candidate.candidate.dto.BulkDeleteRequest req) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.bulkDelete(tenantId, actorUserId, req.ids()));
    }

    /** Internal / Feign — application-service gọi khi reject hồ sơ. */
    @PatchMapping("/{id}/mark-pool")
    public ResponseEntity<Map<String, String>> markPool(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        service.markPool(tenantId, id, body.get("tag"));
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    @PostMapping("/{id}/tags")
    public ResponseEntity<CandidateResponse> addTag(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.addTag(tenantId, id, body.get("tag")));
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ResponseEntity<CandidateResponse> removeTag(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @PathVariable Long tagId) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.removeTag(tenantId, id, tagId));
    }

    @GetMapping("/cv-file/{fileName}")
    public ResponseEntity<org.springframework.core.io.Resource> getCvFile(@PathVariable String fileName) {
        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get("uploads").resolve(fileName);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                String contentType = java.nio.file.Files.probeContentType(filePath);
                if (contentType == null) contentType = "application/octet-stream";
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<CandidateSummaryResponse> getByUserId(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(service.getSummaryByUserId(tenantId, userId));
    }

    /** GDPR self-service: ứng viên tự yêu cầu xóa dữ liệu của mình. */
    @PostMapping("/me/request-deletion")
    public ResponseEntity<Map<String, String>> requestOwnDataDeletion(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {
        if (!AccessGuard.isCandidate(role)) {
            throw new AccessDeniedException("Chỉ ứng viên được thực hiện thao tác này");
        }
        service.requestOwnDataDeletion(tenantId, userId);
        return ResponseEntity.ok(Map.of("message", "Yêu cầu xóa dữ liệu đã được xử lý"));
    }

    @PostMapping("/me/link")
    public ResponseEntity<CandidateResponse> linkMe(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestBody Map<String, String> body) {
        if (!"CANDIDATE".equals(role)) {
            throw new AccessDeniedException("Chỉ ứng viên");
        }
        String email = body.get("email");
        String fullName = body.get("fullName");
        return ResponseEntity.ok(service.linkOrCreateForUser(tenantId, userId, email, fullName));
    }

    @PostMapping(value = "/{id}/cv", consumes = "multipart/form-data")
    public ResponseEntity<CandidateResponse> uploadCv(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        if (AccessGuard.isCandidate(role)) {
            return ResponseEntity.ok(service.uploadCvOwn(tenantId, userId, id, file));
        }
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.uploadCv(tenantId, id, file));
    }
}