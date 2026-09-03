package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.notification.dto.NotificationResponse;
import iuh.fit.se.notification.security.CurrentUser;
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
            ) {
        return ResponseEntity.ok(service.getAll(CurrentUser.required().userId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            ) {
        return ResponseEntity.ok(Map.of(
                "count", service.countUnread(CurrentUser.required().userId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Long id) {
        service.markAsRead(CurrentUser.required().userId(), id);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            ) {
        service.markAllAsRead(CurrentUser.required().userId());
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả đã đọc"));
    }
}
