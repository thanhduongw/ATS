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

import java.util.HashMap;
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
    private final EmailBrandingService emailBrandingService;

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
            boolean candidate = "CANDIDATE".equals(recipient.role());
            EmailLayout.Brand brand = emailBrandingService.brand();
            EmailLinks.Target target = EmailLinks.target(resourceType, resourceId, type, candidate);
            String link = emailBrandingService.absolute(target.path());

            Map<String, String> data = new HashMap<>();
            data.put("title", nullToEmpty(title));
            data.put("message", nullToEmpty(message));
            data.put("recipientName", nullToEmpty(recipient.fullName()));
            data.put("companyName", brand.companyName());
            data.put("link", link);
            data.put("resourceType", nullToEmpty(resourceType));
            data.put("resourceId", resourceId != null ? String.valueOf(resourceId) : "");

            // Mặc định (không có mẫu / mẫu đã tắt): tiêu đề + nội dung của chính thông báo.
            String subject = nullToEmpty(title);
            String body = "Xin chào " + nullToEmpty(recipient.fullName()) + ",\n\n" + nullToEmpty(message)
                    + "\n\nTrân trọng,\n" + (candidate ? "Bộ phận Tuyển dụng " : "Hệ thống tuyển dụng ") + brand.companyName();

            // Mẫu riêng theo người nhận (vd INTERVIEW_REMINDER__CANDIDATE) được ưu tiên, rồi mới tới mẫu chung (mã = loại thông báo).
            EmailTemplateResponse template = findTemplate(type.name() + (candidate ? "__CANDIDATE" : "__STAFF"));
            if (template == null) template = findTemplate(type.name());
            if (template != null) {
                subject = TemplateRenderer.render(template.subject(), data);
                body = TemplateRenderer.render(template.body(), data);
            }

            String text = body + "\n\n" + target.label() + ": " + link;
            String html = EmailLayout.html(brand, subject, body, link, target.label());
            emailNotificationService.sendSafe(recipient.email(), brand.companyName(), subject, text, html);
        } catch (Exception e) {
            log.warn("Skip email userId={}: {}", recipientUserId, e.getMessage());
        }
    }

    private EmailTemplateResponse findTemplate(String code) {
        try {
            EmailTemplateResponse t = masterDataServiceClient.getByCode(code);
            return t != null && t.active() ? t : null;
        } catch (Exception e) {
            log.debug("No email template {}", code);
            return null;
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
