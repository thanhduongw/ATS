package iuh.fit.se.masterdata.experiencelevel;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.experiencelevel.dto.ExperienceLevelRequest;
import iuh.fit.se.masterdata.experiencelevel.dto.ExperienceLevelResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/experience-levels")
@RequiredArgsConstructor
public class ExperienceLevelController {

    private final ExperienceLevelService service;

    @GetMapping
    public ResponseEntity<List<ExperienceLevelResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<ExperienceLevelResponse> create(
            @Valid @RequestBody ExperienceLevelRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExperienceLevelResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ExperienceLevelRequest req) {
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
