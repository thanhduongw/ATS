package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.auditlog.dto.AuditLogResponse;
import iuh.fit.se.notification.security.AuthorizationPolicy;
import iuh.fit.se.notification.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) Long actorUserId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.search(resourceType, actorUserId, from, to));
    }

    /**
     * 3.11: lịch sử của một (vài) đối tượng cụ thể — yêu cầu tuyển dụng, hồ sơ, buổi phỏng vấn, thư mời — cho mọi
     * nhân viên nội bộ. Không trả tên người thực hiện (danh bạ đầy đủ chỉ Quản trị xem được); giao diện tự ghép tên.
     */
    @GetMapping("/resource")
    public ResponseEntity<List<AuditLogResponse>> forResource(
            @RequestParam String resourceType,
            @RequestParam List<Long> resourceIds) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(service.forResource(resourceType, resourceIds));
    }
}
