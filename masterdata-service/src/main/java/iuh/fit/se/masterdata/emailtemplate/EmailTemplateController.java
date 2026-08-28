package iuh.fit.se.masterdata.emailtemplate;

import iuh.fit.se.masterdata.common.AccessGuard;
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
    public ResponseEntity<List<EmailTemplateResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    /** Internal / Feign — dùng bởi notification-service lúc gửi email thật. */
    @GetMapping("/by-code/{code}")
    public ResponseEntity<EmailTemplateResponse> getByCode(
            @RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable String code) {
        return ResponseEntity.ok(service.getByCode(tenantId, code));
    }

    @PostMapping("/{id}/preview")
    public ResponseEntity<Map<String, String>> preview(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> sampleData) {
        return ResponseEntity.ok(service.preview(tenantId, id, sampleData));
    }

    @PostMapping
    public ResponseEntity<EmailTemplateResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody EmailTemplateRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailTemplateResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody EmailTemplateRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.update(tenantId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {
        AccessGuard.requireCompanyAdmin(role);
        service.softDelete(tenantId, id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}