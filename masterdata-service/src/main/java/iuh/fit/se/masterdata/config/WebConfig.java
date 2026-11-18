package iuh.fit.se.masterdata.config;

import iuh.fit.se.masterdata.common.CatalogAuditInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final CatalogAuditInterceptor catalogAuditInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(catalogAuditInterceptor).addPathPatterns("/api/masterdata/**");
    }
}
