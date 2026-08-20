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

        trySendEmail(tenantId, recipientUserId, type, title, message, resourceType, resourceId);
    }

    private void trySendEmail(
            Long tenantId, Long recipientUserId, NotificationType type,
            String title, String message, String resourceType, Long resourceId) {
        try {
            UserSummaryResponse recipient = resolveUser(tenantId, recipientUserId);
            if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
                return;
            }

            String subject = title;
            String body = message;

            // Nếu công ty đã cấu hình mẫu email cho loại thông báo này (code = tên NotificationType)
            // thì render theo mẫu; nếu không có / lỗi thì fallback về title/message mặc định.
            try {
                EmailTemplateResponse template = masterDataServiceClient.getByCode(tenantId, type.name());
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
                log.debug("Không có mẫu email tùy chỉnh cho {} (tenantId={}), dùng nội dung mặc định", type, tenantId);
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
     * Lấy thông tin user từ auth-service (danh sách user theo tenant, lọc theo id).
     * Không cần endpoint mới trên auth.
     */
    private UserSummaryResponse resolveUser(Long tenantId, Long userId) {
        if (tenantId == null || userId == null) {
            return null;
        }
        List<UserSummaryResponse> users = authServiceClient.getUsers(tenantId, null);
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