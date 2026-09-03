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
