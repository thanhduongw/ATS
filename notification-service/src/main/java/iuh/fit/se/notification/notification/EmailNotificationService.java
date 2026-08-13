package iuh.fit.se.notification.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.notification.email-enabled:false}")
    private boolean emailEnabled;

    @Value("${spring.mail.username:}")
    private String from;

    /**
     * Gửi email an toàn: tắt flag / thiếu email / lỗi SMTP → chỉ log, không throw.
     */
    public void sendSafe(String toEmail, String subject, String body) {
        if (!emailEnabled) {
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }
        if (from == null || from.isBlank()) {
            log.warn("Bỏ qua email: spring.mail.username trống");
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(toEmail.trim());
            msg.setSubject(subject != null ? subject : "Thông báo ATS");
            msg.setText(body != null ? body : "");
            mailSender.send(msg);
            log.debug("Đã gửi email tới {}", toEmail);
        } catch (Exception e) {
            log.warn("Gửi email thất bại to={}: {}", toEmail, e.getMessage());
        }
    }
}