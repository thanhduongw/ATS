package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.auditlog.dto.AuditLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notification/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService service;

    @GetMapping
    public ResponseEntity<List<AuditLogResponse>> search(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) Long actorUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        if (!"COMPANY_ADMIN".equals(role)) {
            throw new AccessDeniedException("Chỉ Company Admin được xem nhật ký hệ thống");
        }
        return ResponseEntity.ok(service.search(tenantId, resourceType, actorUserId, from, to));
    }
}