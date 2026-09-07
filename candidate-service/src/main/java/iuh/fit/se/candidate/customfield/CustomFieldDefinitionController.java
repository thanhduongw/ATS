package iuh.fit.se.candidate.customfield;

import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionRequest;
import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionResponse;
import iuh.fit.se.candidate.security.AuthorizationPolicy;
import iuh.fit.se.candidate.security.CurrentUser;
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
    public ResponseEntity<List<CustomFieldDefinitionResponse>> getAll() {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<CustomFieldDefinitionResponse> create(
            @Valid @RequestBody CustomFieldDefinitionRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomFieldDefinitionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomFieldDefinitionRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}
