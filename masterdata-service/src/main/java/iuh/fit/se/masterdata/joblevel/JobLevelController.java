package iuh.fit.se.masterdata.joblevel;

import iuh.fit.se.masterdata.common.AccessGuard;
import iuh.fit.se.masterdata.joblevel.dto.JobLevelRequest;
import iuh.fit.se.masterdata.joblevel.dto.JobLevelResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/job-levels")
@RequiredArgsConstructor
public class JobLevelController {

    private final JobLevelService service;

    @GetMapping
    public ResponseEntity<List<JobLevelResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    @PostMapping
    public ResponseEntity<JobLevelResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody JobLevelRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobLevelResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobLevelRequest req) {
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