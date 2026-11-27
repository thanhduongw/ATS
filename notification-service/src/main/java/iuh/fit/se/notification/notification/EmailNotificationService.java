package iuh.fit.se.notification.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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

    private static final java.util.regex.Pattern EMAIL =
            java.util.regex.Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$");

    /** Chỉ gửi tới địa chỉ đúng dạng và không thuộc miền dành cho thử nghiệm (example.com, .invalid, .test…). */
    static boolean isDeliverable(String email) {
        if (email == null || email.isBlank()) return false;
        String e = email.trim().toLowerCase();
        if (!EMAIL.matcher(e).matches()) return false;
        return !(e.endsWith("@example.com") || e.endsWith("@example.org") || e.endsWith("@example.net")
                || e.endsWith(".invalid") || e.endsWith(".test") || e.endsWith(".example") || e.endsWith(".localhost"));
    }

    /**
     * Gửi email an toàn ở luồng nền (không làm chậm thao tác của người dùng):
     * tắt flag / địa chỉ không hợp lệ / lỗi SMTP → chỉ log, không throw.
     * Gửi cả bản HTML (khung email) lẫn bản văn bản thường cho trình đọc mail không hiển thị HTML.
     */
    @org.springframework.scheduling.annotation.Async
    public void sendSafe(String toEmail, String fromName, String subject, String text, String html) {
        if (!emailEnabled) {
            return;
        }
        if (!isDeliverable(toEmail)) {
            log.debug("Bỏ qua email tới địa chỉ không hợp lệ / địa chỉ thử nghiệm: {}", toEmail);
            return;
        }
        if (from == null || from.isBlank()) {
            log.warn("Bỏ qua email: spring.mail.username trống");
            return;
        }
        try {
            jakarta.mail.internet.MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            if (fromName != null && !fromName.isBlank()) helper.setFrom(from, fromName);
            else helper.setFrom(from);
            helper.setTo(toEmail.trim());
            helper.setSubject(subject != null ? subject : "Thông báo tuyển dụng");
            helper.setText(text != null ? text : "", html != null ? html : "");
            mailSender.send(msg);
            log.debug("Đã gửi email tới {}", toEmail);
        } catch (Exception e) {
            log.warn("Gửi email thất bại to={}: {}", toEmail, e.getMessage());
        }
    }
}
