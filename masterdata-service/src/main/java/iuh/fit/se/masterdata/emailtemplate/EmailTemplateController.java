package iuh.fit.se.masterdata.emailtemplate;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.emailtemplate.dto.EmailTemplateRequest;
import iuh.fit.se.masterdata.emailtemplate.dto.EmailTemplateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/email-templates")
@RequiredArgsConstructor
public class EmailTemplateController {

    private final EmailTemplateService service;

    @GetMapping
    public ResponseEntity<List<EmailTemplateResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    /** Internal / Feign — dùng bởi notification-service lúc gửi email thật. */
    @GetMapping("/by-code/{code}")
    public ResponseEntity<EmailTemplateResponse> getByCode(
            @PathVariable String code) {
        return ResponseEntity.ok(service.getByCode(code));
    }

    @PostMapping("/{id}/preview")
    public ResponseEntity<Map<String, String>> preview(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> sampleData) {
        return ResponseEntity.ok(service.preview(id, sampleData));
    }

    @PostMapping
    public ResponseEntity<EmailTemplateResponse> create(
            @Valid @RequestBody EmailTemplateRequest req) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailTemplateResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody EmailTemplateRequest req) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}
