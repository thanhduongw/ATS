package iuh.fit.se.masterdata.jobtitle;

import iuh.fit.se.masterdata.common.AccessGuard;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleRequest;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/job-titles")
@RequiredArgsConstructor
public class JobTitleController {

    private final JobTitleService service;

    @GetMapping
    public ResponseEntity<List<JobTitleResponse>> getAll(@RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    @PostMapping
    public ResponseEntity<JobTitleResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody JobTitleRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobTitleResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody JobTitleRequest req) {
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