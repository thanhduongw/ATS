package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notification/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(service.getAll(tenantId, userId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(Map.of("count", service.countUnread(tenantId, userId)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        service.markAsRead(tenantId, userId, id);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId) {
        service.markAllAsRead(tenantId, userId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả đã đọc"));
    }
}