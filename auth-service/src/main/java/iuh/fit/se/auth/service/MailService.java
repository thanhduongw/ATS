package iuh.fit.se.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Xác thực đăng ký hệ thống ATS");
        message.setText("Mã OTP xác thực của bạn là: " + otp + ". Mã có hiệu lực trong 10 phút.");
        mailSender.send(message);
    }
}