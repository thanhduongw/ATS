package iuh.fit.se.auth.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Xác thực đăng ký hệ thống ATS");
            message.setText("Mã OTP xác thực của bạn là: " + otp + ". Mã có hiệu lực trong 10 phút.");
            mailSender.send(message);
            log.info("Đã gửi email OTP thành công tới {}", toEmail);
        } catch (Exception e) {
            log.warn("Không thể gửi mail qua SMTP ({}), in mã OTP ra console để test.", e.getMessage());
            System.out.println("==================================================");
            System.out.println("[DEV MODE REGISTRATION OTP] Email: " + toEmail + " | OTP: " + otp);
            System.out.println("==================================================");
        }
    }

    public void sendPasswordResetEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Mã OTP khôi phục mật khẩu hệ thống ATS");
            message.setText("Mã OTP khôi phục mật khẩu của bạn là: " + otp + 
                    ". Mã này có hiệu lực trong 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.");
            mailSender.send(message);
            log.info("Đã gửi email khôi phục mật khẩu tới {}", toEmail);
        } catch (Exception e) {
            log.warn("Không thể gửi mail qua SMTP ({}), in mã OTP ra console để test.", e.getMessage());
            System.out.println("==================================================");
            System.out.println("[DEV MODE RESET PASSWORD OTP] Email: " + toEmail + " | OTP: " + otp);
            System.out.println("==================================================");
        }
    }
}