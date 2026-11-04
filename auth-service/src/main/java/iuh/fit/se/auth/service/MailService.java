package iuh.fit.se.auth.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.log-otp-on-failure:false}")
    private boolean logOtpOnFailure;

    public void sendOtpEmail(String toEmail, String otp) {
        send(toEmail, "Xac thuc dang ky he thong ATS",
                "Ma OTP xac thuc cua ban la: " + otp +
                        ". Ma co hieu luc trong 10 phut.", otp, "REGISTRATION");
    }

    public void sendPasswordResetEmail(String toEmail, String otp) {
        send(toEmail, "Khoi phuc mat khau he thong ATS",
                "Ma OTP khoi phuc mat khau cua ban la: " + otp +
                        ". Ma co hieu luc trong 15 phut. Khong chia se ma nay.",
                otp, "PASSWORD_RESET");
    }

    /**
     * Email mời tham gia (docs/UI A04 "Email người nhận sẽ thấy"): lời chào, người mời, vai trò,
     * lời nhắn, nút "Đặt mật khẩu & bắt đầu", "Liên kết hết hạn sau 7 ngày."
     */
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

    private void send(String toEmail, String subject, String body, String otp, String purpose) {
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
