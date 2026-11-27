package iuh.fit.se.notification.notification;

import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.dto.PublicThemeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Tên / logo / màu công ty cho khung email (đọc từ auth-service, giữ 1 phút) và địa chỉ web công khai. */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailBrandingService {

    private static final long TTL_MS = 60 * 1000L; // đổi tên / màu công ty: email mới dùng giá trị mới sau tối đa 1 phút

    private final AuthServiceClient authServiceClient;

    @Value("${app.public-url:http://localhost:3000}")
    private String publicUrl;

    private volatile EmailLayout.Brand cached;
    private volatile long cachedAt;

    public EmailLayout.Brand brand() {
        EmailLayout.Brand b = cached;
        if (b != null && System.currentTimeMillis() - cachedAt < TTL_MS) return b;
        try {
            PublicThemeResponse t = authServiceClient.getPublicTheme();
            b = t == null ? new EmailLayout.Brand(null, null, null)
                    : new EmailLayout.Brand(t.companyName(), t.logoUrl(), t.brandColor());
            cached = b;
            cachedAt = System.currentTimeMillis();
            return b;
        } catch (Exception e) {
            log.debug("Không đọc được thông tin công ty cho email: {}", e.getMessage());
            return b != null ? b : new EmailLayout.Brand(null, null, null);
        }
    }

    /** Ghép địa chỉ web công khai (PUBLIC_URL) với đường dẫn trong ứng dụng. */
    public String absolute(String path) {
        String base = publicUrl == null ? "" : publicUrl.trim();
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base + path;
    }
}
