package iuh.fit.se.auth.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Bật @Async — dùng cho việc gửi email ở luồng nền (xem MailService). */
@Configuration
@EnableAsync
public class AsyncConfig {
}
