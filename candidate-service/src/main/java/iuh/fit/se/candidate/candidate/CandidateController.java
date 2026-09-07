package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateCreateRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateUpdateRequest;
import iuh.fit.se.candidate.common.PageResponse;
import iuh.fit.se.candidate.security.AuthorizationPolicy;
import iuh.fit.se.candidate.security.CurrentUser;
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
    public ResponseEntity<PageResponse<CandidateResponse>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) PoolStatus poolStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(actor, keyword, hasCv, poolStatus, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CandidateResponse> getById(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getByIdForActor(id, actor));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse> getSummaryById(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getSummaryByIdForActor(id, CurrentUser.required()));
    }

    @PostMapping
    public ResponseEntity<CandidateResponse> create(
            @Valid @RequestBody CandidateCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireAdmin(actor);
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CandidateResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CandidateUpdateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.update(id, actor, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.softDelete(id, actor);
        return ResponseEntity.ok(Map.of("message", "Xóa ứng viên thành công"));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<iuh.fit.se.candidate.candidate.dto.BulkOperationResponse> bulkDelete(
            @Valid @RequestBody iuh.fit.se.candidate.candidate.dto.BulkDeleteRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.bulkDelete(actor, req.ids()));
    }

    /** Internal / Feign — application-service gọi khi reject hồ sơ. */
    @PatchMapping("/{id}/mark-pool")
    public ResponseEntity<Map<String, String>> markPool(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        service.markPool(id, actor, body.get("tag"));
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    @PostMapping("/{id}/tags")
    public ResponseEntity<CandidateResponse> addTag(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.addTag(id, actor, body.get("tag")));
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ResponseEntity<CandidateResponse> removeTag(
            @PathVariable Long id,
            @PathVariable Long tagId) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.removeTag(id, actor, tagId));
    }

    @GetMapping("/cv-file/{fileName}")
    public ResponseEntity<org.springframework.core.io.Resource> getCvFile(@PathVariable String fileName) {
        CurrentUser actor = CurrentUser.required();
        service.requireCvFileAccess(actor, fileName);
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
            @PathVariable Long userId) {
        CurrentUser actor = CurrentUser.required();
        if (AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE) {
            AuthorizationPolicy.requireSelf(actor, userId);
        } else {
            AuthorizationPolicy.requireInternal(actor);
        }
        return ResponseEntity.ok(service.getSummaryByUserIdForActor(userId, actor));
    }

    /** GDPR self-service: ứng viên tự yêu cầu xóa dữ liệu của mình. */
    @PostMapping("/me/request-deletion")
    public ResponseEntity<Map<String, String>> requestOwnDataDeletion(
            ) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        service.requestOwnDataDeletion(actor.userId());
        return ResponseEntity.ok(Map.of("message", "Yêu cầu xóa dữ liệu đã được xử lý"));
    }

    @PostMapping(value = "/{id}/cv", consumes = "multipart/form-data")
    public ResponseEntity<CandidateResponse> uploadCv(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.uploadCv(id, actor, file));
    }
}
