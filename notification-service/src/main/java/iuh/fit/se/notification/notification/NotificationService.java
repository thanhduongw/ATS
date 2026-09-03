package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.MasterDataServiceClient;
import iuh.fit.se.notification.client.dto.EmailTemplateResponse;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import iuh.fit.se.notification.exception.BusinessException;
import iuh.fit.se.notification.notification.dto.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final RealtimePushService realtimePushService;
    private final EmailNotificationService emailNotificationService;
    private final AuthServiceClient authServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;

    public List<NotificationResponse> getAll(Long userId) {
        return repository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public long countUnread(Long userId) {
        return repository.countByRecipientUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long userId, Long id) {
        Notification n = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy thông báo"));
        if (!n.getRecipientUserId().equals(userId)) {
            throw new BusinessException("Không tìm thấy thông báo");
        }
        n.setRead(true);
        repository.save(n);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> list =
                repository.findByRecipientUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> n.setRead(true));
        repository.saveAll(list);
    }

    /**
     * Tạo notification + push WebSocket + (optional) email.
     * Email lỗi không làm fail transaction in-app.
     */
    @Transactional
    public void createAndPush(
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

        trySendEmail(recipientUserId, type, title, message, resourceType, resourceId);
    }

    private void trySendEmail(
            Long recipientUserId, NotificationType type,
            String title, String message, String resourceType, Long resourceId) {
        try {
            UserSummaryResponse recipient = resolveUser(recipientUserId);
            if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
                return;
            }

            String subject = title;
            String body = message;

            // Nếu công ty đã cấu hình mẫu email cho loại thông báo này (code = tên NotificationType)
            // thì render theo mẫu; nếu không có / lỗi thì fallback về title/message mặc định.
            try {
                EmailTemplateResponse template = masterDataServiceClient.getByCode(type.name());
                if (template != null && template.active()) {
                    Map<String, String> data = Map.of(
                            "title", nullToEmpty(title),
                            "message", nullToEmpty(message),
                            "recipientName", nullToEmpty(recipient.fullName()),
                            "resourceType", nullToEmpty(resourceType),
                            "resourceId", resourceId != null ? String.valueOf(resourceId) : "");
                    subject = TemplateRenderer.render(template.subject(), data);
                    body = TemplateRenderer.render(template.body(), data);
                }
            } catch (Exception e) {
                log.debug("No custom email template for {}; using default content", type);
            }

            emailNotificationService.sendSafe(recipient.email(), subject, body);
        } catch (Exception e) {
            log.warn("Skip email userId={}: {}", recipientUserId, e.getMessage());
        }
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }

    /**
     * Lấy thông tin user từ auth-service (danh sách người dùng của doanh nghiệp, lọc theo id).
     * Không cần endpoint mới trên auth.
     */
    private UserSummaryResponse resolveUser(Long userId) {
        if (userId == null) {
            return null;
        }
        List<UserSummaryResponse> users = authServiceClient.getUsers(null);
        if (users == null || users.isEmpty()) {
            return null;
        }
        return users.stream()
                .filter(u -> userId.equals(u.id()))
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
