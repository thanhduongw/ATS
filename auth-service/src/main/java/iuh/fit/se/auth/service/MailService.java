package iuh.fit.se.auth.service;

import iuh.fit.se.auth.repository.CompanyRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final CompanyRepository companyRepository;

    @Value("${app.mail.log-otp-on-failure:false}")
    private boolean logOtpOnFailure;

    @Value("${spring.mail.username:}")
    private String from;

    /*
     * Mọi hàm gửi mail đều @Async: request (đăng ký, mời người dùng, quên mật khẩu) trả về ngay, việc nói chuyện
     * với máy chủ SMTP (5–8 giây) chạy ở luồng nền. Lỗi gửi chỉ ghi log, không làm hỏng thao tác của người dùng.
     * Mỗi email gồm bản HTML (khung chung, tên / logo / màu công ty) và bản văn bản thường.
     */
    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        MailLayout.Brand b = brand();
        String subject = "Mã xác minh tài khoản ứng viên tại " + b.companyName();
        String html = MailLayout.page(b, "Xác minh địa chỉ email của bạn",
                MailLayout.p("Cảm ơn bạn đã đăng ký tài khoản ứng viên tại " + b.companyName()
                        + ". Vui lòng nhập mã dưới đây để hoàn tất xác minh email:")
                        + MailLayout.code(b, otp)
                        + MailLayout.note("Mã có hiệu lực trong 10 phút. Vì lý do bảo mật, không chia sẻ mã này với bất kỳ ai, "
                        + "kể cả nhân viên của " + b.companyName() + ". Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này."));
        String text = "Xin chào,\n\nCảm ơn bạn đã đăng ký tài khoản ứng viên tại " + b.companyName()
                + ".\nMã xác minh của bạn là: " + otp
                + "\n\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai. "
                + "Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.\n\nTrân trọng,\n" + b.companyName();
        send(toEmail, b, subject, text, html, otp, "REGISTRATION");
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String otp) {
        MailLayout.Brand b = brand();
        String subject = "Mã đặt lại mật khẩu — " + b.companyName();
        String html = MailLayout.page(b, "Đặt lại mật khẩu",
                MailLayout.p("Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản dùng địa chỉ email này. "
                        + "Nhập mã dưới đây để tạo mật khẩu mới:")
                        + MailLayout.code(b, otp)
                        + MailLayout.note("Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — "
                        + "mật khẩu hiện tại của bạn vẫn được giữ nguyên."));
        String text = "Xin chào,\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\nMã đặt lại mật khẩu: "
                + otp + "\n\nMã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này; "
                + "mật khẩu hiện tại vẫn được giữ nguyên.\n\nTrân trọng,\n" + b.companyName();
        send(toEmail, b, subject, text, html, otp, "PASSWORD_RESET");
    }

    /**
     * Email mời tham gia (docs/UI A04 "Email người nhận sẽ thấy"): lời chào, người mời, vai trò,
     * lời nhắn, nút "Đặt mật khẩu & bắt đầu", "Liên kết hết hạn sau 7 ngày."
     */
    @Async
    public void sendInvitationEmail(String toEmail, String fullName, String inviterName,
                                    iuh.fit.se.auth.enums.RoleName role, String message, String link, int validDays) {
        MailLayout.Brand b = brand();
        String invite = inviterName + " mời bạn tham gia hệ thống tuyển dụng của " + b.companyName()
                + (role != null ? " với vai trò " + roleLabel(role) : "") + ".";
        String html = MailLayout.page(b, "Lời mời tham gia hệ thống tuyển dụng",
                MailLayout.p("Xin chào " + fullName + ",")
                        + MailLayout.p(invite)
                        + (message != null && !message.isBlank() ? MailLayout.quote(b, message) : "")
                        + MailLayout.p("Bấm nút dưới đây để đặt mật khẩu và bắt đầu sử dụng:")
                        + MailLayout.button(b, "Đặt mật khẩu & bắt đầu", link)
                        + MailLayout.note("Liên kết có hiệu lực trong " + validDays + " ngày và chỉ dùng được một lần. "
                        + "Nếu bạn không mong đợi lời mời này, hãy bỏ qua email."));
        StringBuilder text = new StringBuilder("Xin chào ").append(fullName).append(",\n\n").append(invite).append("\n");
        if (message != null && !message.isBlank()) text.append("\n“").append(message).append("”\n");
        text.append("\nĐặt mật khẩu & bắt đầu: ").append(link)
                .append("\n\nLiên kết có hiệu lực trong ").append(validDays).append(" ngày và chỉ dùng được một lần.")
                .append("\n\nTrân trọng,\n").append(b.companyName());
        send(toEmail, b, "Lời mời tham gia hệ thống tuyển dụng của " + b.companyName(), text.toString(), html, link, "INVITATION");
    }

    private MailLayout.Brand brand() {
        try {
            return companyRepository.findFirstByOrderByIdAsc()
                    .map(c -> new MailLayout.Brand(c.getName(), c.getLogoUrl(), c.getBrandColor()))
                    .orElseGet(() -> new MailLayout.Brand(null, null, null));
        } catch (Exception e) {
            return new MailLayout.Brand(null, null, null);
        }
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

    private void send(String toEmail, MailLayout.Brand brand, String subject, String text, String html,
                      String otp, String purpose) {
        if (undeliverable(toEmail)) {
            log.info("Bo qua gui email {} toi dia chi thu nghiem {}", purpose, toEmail);
            if (logOtpOnFailure) {
                log.warn("DEV ONLY OTP for {} at {}: {}", purpose, toEmail, otp);
            }
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (from != null && !from.isBlank()) helper.setFrom(from, brand.companyName());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text, html);
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
