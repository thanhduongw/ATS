package iuh.fit.se.auth.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.log-otp-on-failure:false}")
    private boolean logOtpOnFailure;

    /*
     * Mọi hàm gửi mail đều @Async: request (đăng ký, mời người dùng, quên mật khẩu) trả về ngay, việc nói chuyện
     * với máy chủ SMTP (5–8 giây) chạy ở luồng nền. Lỗi gửi chỉ ghi log, không làm hỏng thao tác của người dùng.
     */
    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        send(toEmail, "Mã xác minh tài khoản",
                "Mã xác minh của bạn là: " + otp + "\n\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này cho người khác.",
                otp, "REGISTRATION");
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String otp) {
        send(toEmail, "Mã đặt lại mật khẩu",
                "Mã đặt lại mật khẩu của bạn là: " + otp
                        + "\n\nMã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
                otp, "PASSWORD_RESET");
    }

    /**
     * Email mời tham gia (docs/UI A04 "Email người nhận sẽ thấy"): lời chào, người mời, vai trò,
     * lời nhắn, nút "Đặt mật khẩu & bắt đầu", "Liên kết hết hạn sau 7 ngày."
     */
    @Async
    public void sendInvitationEmail(String toEmail, String fullName, String inviterName,
                                    iuh.fit.se.auth.enums.RoleName role, String message, String link, int validDays) {
        StringBuilder body = new StringBuilder()
                .append("Chào ").append(fullName).append(",\n\n")
                .append(inviterName).append(" mời bạn tham gia hệ thống tuyển dụng");
        if (role != null) body.append(" với vai trò ").append(roleLabel(role));
        body.append(".\n");
        if (message != null) body.append("\n“").append(message).append("”\n");
        body.append("\nĐặt mật khẩu & bắt đầu: ").append(link)
                .append("\n\nLiên kết hết hạn sau ").append(validDays).append(" ngày.");
        send(toEmail, "Bạn được mời tham gia hệ thống tuyển dụng", body.toString(), link, "INVITATION");
    }

    private static String roleLabel(iuh.fit.se.auth.enums.RoleName role) {
        return switch (role) {
            case COMPANY_ADMIN -> "Quản trị doanh nghiệp";
            case RECRUITER -> "Chuyên viên tuyển dụng";
            case HIRING_MANAGER -> "Đại diện phòng ban";
            default -> role.name();
        };
    }

    /** Tên miền dành riêng cho thử nghiệm (RFC 2606 / 6761) — không có hộp thư thật nên không gửi. */
    private static boolean undeliverable(String email) {
        if (email == null) return true;
        String e = email.trim().toLowerCase(java.util.Locale.ROOT);
        return e.endsWith("@example.com") || e.endsWith("@example.org") || e.endsWith("@example.net")
                || e.endsWith(".invalid") || e.endsWith(".test") || e.endsWith(".example") || e.endsWith(".localhost");
    }

    private void send(String toEmail, String subject, String body, String otp, String purpose) {
        if (undeliverable(toEmail)) {
            log.info("Bo qua gui email {} toi dia chi thu nghiem {}", purpose, toEmail);
            if (logOtpOnFailure) {
                log.warn("DEV ONLY OTP for {} at {}: {}", purpose, toEmail, otp);
            }
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Auth email sent for purpose {}", purpose);
        } catch (Exception exception) {
            log.warn("Could not send auth email for purpose {}: {}", purpose, exception.getMessage());
            if (logOtpOnFailure) {
                log.warn("DEV ONLY OTP for {} at {}: {}", purpose, toEmail, otp);
            }
        }
    }
}
