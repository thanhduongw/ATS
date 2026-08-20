package iuh.fit.se.candidate.customfield;

import iuh.fit.se.candidate.common.AccessGuard;
import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionRequest;
import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate/custom-field-definitions")
@RequiredArgsConstructor
public class CustomFieldDefinitionController {

    private final CustomFieldDefinitionService service;

    @GetMapping
    public ResponseEntity<List<CustomFieldDefinitionResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    @PostMapping
    public ResponseEntity<CustomFieldDefinitionResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody CustomFieldDefinitionRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomFieldDefinitionResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody CustomFieldDefinitionRequest req) {
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
