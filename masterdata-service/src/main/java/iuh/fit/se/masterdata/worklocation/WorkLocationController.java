package iuh.fit.se.masterdata.worklocation;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.worklocation.dto.WorkLocationRequest;
import iuh.fit.se.masterdata.worklocation.dto.WorkLocationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/work-locations")
@RequiredArgsConstructor
public class WorkLocationController {

    private final WorkLocationService service;

    @GetMapping
    public ResponseEntity<List<WorkLocationResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<WorkLocationResponse> create(
            @Valid @RequestBody WorkLocationRequest req) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkLocationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody WorkLocationRequest req) {
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
