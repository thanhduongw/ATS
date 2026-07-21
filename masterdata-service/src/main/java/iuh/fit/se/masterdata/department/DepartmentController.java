package iuh.fit.se.masterdata.department;

import iuh.fit.se.masterdata.common.AccessGuard;
import iuh.fit.se.masterdata.department.dto.DepartmentRequest;
import iuh.fit.se.masterdata.department.dto.DepartmentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService service;

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId) {
        return ResponseEntity.ok(service.getAll(tenantId));
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody DepartmentRequest req) {
        AccessGuard.requireCompanyAdmin(role);
        return ResponseEntity.ok(service.create(tenantId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentResponse> update(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id,
            @Valid @RequestBody DepartmentRequest req) {
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
        return ResponseEntity.ok(Map.of("message", "Xóa phòng ban thành công"));
    }
}