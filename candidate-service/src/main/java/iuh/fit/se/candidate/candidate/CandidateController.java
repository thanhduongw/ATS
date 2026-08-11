package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateCreateRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateUpdateRequest;
import iuh.fit.se.candidate.common.AccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<List<CandidateResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
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

    @PostMapping(value = "/{id}/cv", consumes = "multipart/form-data")
    public ResponseEntity<CandidateResponse> uploadCv(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        AccessGuard.requireRecruiterOrAbove(role);
        return ResponseEntity.ok(service.uploadCv(tenantId, id, file));
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
}