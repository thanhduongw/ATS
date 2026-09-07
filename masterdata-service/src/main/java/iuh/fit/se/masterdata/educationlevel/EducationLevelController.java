package iuh.fit.se.masterdata.educationlevel;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.educationlevel.dto.EducationLevelRequest;
import iuh.fit.se.masterdata.educationlevel.dto.EducationLevelResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/education-levels")
@RequiredArgsConstructor
public class EducationLevelController {

    private final EducationLevelService service;

    @GetMapping
    public ResponseEntity<List<EducationLevelResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<EducationLevelResponse> create(
            @Valid @RequestBody EducationLevelRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EducationLevelResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody EducationLevelRequest req) {
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
