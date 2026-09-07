package iuh.fit.se.masterdata.skill;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.skill.dto.SkillRequest;
import iuh.fit.se.masterdata.skill.dto.SkillResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService service;

    @GetMapping
    public ResponseEntity<List<SkillResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<SkillResponse> create(
            @Valid @RequestBody SkillRequest req) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SkillResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SkillRequest req) {
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
