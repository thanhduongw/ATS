package iuh.fit.se.dashboard.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class FeignClientConfig {

    @Bean
    public RequestInterceptor headerForwardingInterceptor() {
        return (RequestTemplate requestTemplate) -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) return;

            HttpServletRequest request = attributes.getRequest();
            forwardHeader(request, requestTemplate, "X-Tenant-Id");
            forwardHeader(request, requestTemplate, "X-User-Id");
            forwardHeader(request, requestTemplate, "X-User-Role");
        };
    }

    private void forwardHeader(HttpServletRequest request, RequestTemplate template, String headerName) {
        String value = request.getHeader(headerName);
        if (value != null && !value.isBlank()) {
            template.header(headerName, value);
        }
    }
}