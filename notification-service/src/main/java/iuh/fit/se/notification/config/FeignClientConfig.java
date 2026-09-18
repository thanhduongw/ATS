package iuh.fit.se.notification.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignClientConfig {

    private static final String INTERNAL_USER_ID = "1";
    private static final String INTERNAL_USER_EMAIL = "notification-service@internal.local";
    private static final String INTERNAL_USER_ROLE = "SYSTEM";

    @Bean
    public RequestInterceptor headerForwardingInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                // Rabbit listener không có HTTP request để chuyển tiếp. Dùng danh tính dịch vụ
                // chỉ cho các lời gọi đọc dữ liệu nội bộ phục vụ tạo thông báo.
                requestTemplate.header("X-User-Id", INTERNAL_USER_ID);
                requestTemplate.header("X-User-Email", INTERNAL_USER_EMAIL);
                requestTemplate.header("X-User-Role", INTERNAL_USER_ROLE);
                return;
            }

            HttpServletRequest request = attributes.getRequest();
            forwardHeader(request, requestTemplate, "X-User-Id");
            forwardHeader(request, requestTemplate, "X-User-Email");
            forwardHeader(request, requestTemplate, "X-User-Role");
            forwardHeader(request, requestTemplate, "X-Department-Id");
        };
    }

    private void forwardHeader(HttpServletRequest request, feign.RequestTemplate template, String headerName) {
        String value = request.getHeader(headerName);
        if (value != null) {
            template.header(headerName, value);
        }
    }
}
