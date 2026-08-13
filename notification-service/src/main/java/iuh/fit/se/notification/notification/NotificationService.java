package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import iuh.fit.se.notification.exception.BusinessException;
import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final RealtimePushService realtimePushService;
    private final EmailNotificationService emailNotificationService;
    private final AuthServiceClient authServiceClient;

    public List<NotificationResponse> getAll(Long tenantId, Long userId) {
        return repository
                .findByTenantIdAndRecipientUserIdOrderByCreatedAtDesc(tenantId, userId)
                .stream()
                .map(this::toResponse)
                .toList();
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
        List<Notification> list =
                repository.findByTenantIdAndRecipientUserIdOrderByCreatedAtDesc(tenantId, userId);
        list.forEach(n -> n.setRead(true));
        repository.saveAll(list);
    }

    /**
     * Tạo notification + push WebSocket + (optional) email.
     * Email lỗi không làm fail transaction in-app.
     */
    @Transactional
    public void createAndPush(
            Long tenantId,
            Long recipientUserId,
            NotificationType type,
            String title,
            String message,
            String resourceType,
            Long resourceId) {

        if (recipientUserId == null) {
            log.warn("Bỏ qua createAndPush: recipientUserId null, type={}", type);
            return;
        }

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

        NotificationResponse dto = toResponse(saved);

        try {
            realtimePushService.pushToUser(recipientUserId, dto);
        } catch (Exception e) {
            log.warn("Realtime push thất bại userId={}: {}", recipientUserId, e.getMessage());
        }

        trySendEmail(tenantId, recipientUserId, title, message);
    }

    private void trySendEmail(
            Long tenantId, Long recipientUserId, String title, String message) {
        try {
            String email = resolveUserEmail(tenantId, recipientUserId);
            if (email == null) {
                return;
            }
            emailNotificationService.sendSafe(email, title, message);
        } catch (Exception e) {
            log.warn("Skip email userId={}: {}", recipientUserId, e.getMessage());
        }
    }

    /**
     * Lấy email từ auth-service (danh sách user theo tenant, lọc theo id).
     * Không cần endpoint mới trên auth.
     */
    private String resolveUserEmail(Long tenantId, Long userId) {
        if (tenantId == null || userId == null) {
            return null;
        }
        List<UserSummaryResponse> users = authServiceClient.getUsers(tenantId, null);
        if (users == null || users.isEmpty()) {
            return null;
        }
        return users.stream()
                .filter(u -> userId.equals(u.id()))
                .map(UserSummaryResponse::email)
                .filter(e -> e != null && !e.isBlank())
                .findFirst()
                .orElse(null);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getResourceType(),
                n.getResourceId(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}