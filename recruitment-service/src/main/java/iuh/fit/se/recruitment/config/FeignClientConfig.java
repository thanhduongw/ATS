package iuh.fit.se.recruitment.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor headerForwardingInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) return;

            HttpServletRequest request = attributes.getRequest();
            forwardHeader(request, requestTemplate, "X-Tenant-Id");
            forwardHeader(request, requestTemplate, "X-User-Id");
            forwardHeader(request, requestTemplate, "X-User-Role");
        };
    }

    private void forwardHeader(HttpServletRequest request, feign.RequestTemplate template, String headerName) {
        String value = request.getHeader(headerName);
        if (value != null) {
            template.header(headerName, value);
        }
    }
}