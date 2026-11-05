package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.request.CareersPageDraftRequest;
import iuh.fit.se.auth.dto.response.CareersPageResponse;
import iuh.fit.se.auth.security.AuthorizationPolicy;
import iuh.fit.se.auth.security.CurrentUser;
import iuh.fit.se.auth.service.CareersPageService;
import iuh.fit.se.auth.service.ImageStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * A09/A10 · Trang tuyển dụng (Quản trị doanh nghiệp) + tải ảnh công khai.
 * Bản công khai: `GET /api/auth/public/careers-page` (PublicCompanyController).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class CareersPageController {

    private final CareersPageService careersPageService;
    private final ImageStorageService imageStorageService;

    @GetMapping("/careers-page")
    public ResponseEntity<CareersPageResponse> get() {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(careersPageService.getForAdmin());
    }

    /** Lưu tự động bản nháp — trang công khai chưa đổi cho tới khi xuất bản. */
    @PutMapping("/careers-page/draft")
    public ResponseEntity<CareersPageResponse> saveDraft(@Valid @RequestBody CareersPageDraftRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(careersPageService.saveDraft(req.config()));
    }

    @PostMapping("/careers-page/publish")
    public ResponseEntity<CareersPageResponse> publish() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireAdmin(actor);
        return ResponseEntity.ok(careersPageService.publish(actor.userId()));
    }

    /**
     * Tải một ảnh công khai lên S3. `folder`: careers (trang tuyển dụng) · logo (chỉ Quản trị) · avatars
     * (mọi người dùng — ảnh đại diện của chính mình).
     */
    @PostMapping(value = "/files/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "careers") String folder) {
        CurrentUser actor = CurrentUser.required();
        if (!"avatars".equals(folder)) AuthorizationPolicy.requireAdmin(actor);
        return ResponseEntity.ok(Map.of("url", imageStorageService.upload(file, folder)));
    }
}
