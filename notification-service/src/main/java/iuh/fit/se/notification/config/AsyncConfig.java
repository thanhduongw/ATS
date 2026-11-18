package iuh.fit.se.notification.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Bật @Async — email gửi ở luồng nền (xem EmailNotificationService). */
@Configuration
@EnableAsync
public class AsyncConfig {
}
