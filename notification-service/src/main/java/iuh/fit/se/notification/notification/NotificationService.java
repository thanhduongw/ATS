package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.exception.BusinessException;
import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final RealtimePushService realtimePushService;

    public List<NotificationResponse> getAll(Long tenantId, Long userId) {
        return repository.findByTenantIdAndRecipientUserIdOrderByCreatedAtDesc(tenantId, userId)
                .stream().map(this::toResponse).toList();
    }

    public long countUnread(Long tenantId, Long userId) {
        return repository.countByTenantIdAndRecipientUserIdAndReadFalse(tenantId, userId);
    }

    @Transactional
    public void markAsRead(Long tenantId, Long userId, Long id) {
        Notification n = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông báo"));
        if (!n.getTenantId().equals(tenantId) || !n.getRecipientUserId().equals(userId)) {
            throw new BusinessException("Không tìm thấy thông báo");
        }
        n.setRead(true);
        repository.save(n);
    }

    @Transactional
    public void markAllAsRead(Long tenantId, Long userId) {
        repository.findByTenantIdAndRecipientUserIdOrderByCreatedAtDesc(tenantId, userId)
                .forEach(n -> n.setRead(true));
    }

    /** Tạo + lưu + đẩy realtime trong 1 bước — dùng bởi các listener ở Bước 7 */
    @Transactional
    public void createAndPush(Long tenantId, Long recipientUserId, NotificationType type,
                              String title, String message, String resourceType, Long resourceId) {
        Notification saved = repository.save(Notification.builder()
                .tenantId(tenantId)
                .recipientUserId(recipientUserId)
                .type(type)
                .title(title)
                .message(message)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .read(false)
                .build());

        realtimePushService.pushToUser(recipientUserId, toResponse(saved));
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getMessage(),
                n.getResourceType(), n.getResourceId(), n.isRead(), n.getCreatedAt());
    }
}