package iuh.fit.se.dashboard.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI dashboardServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Dashboard Service API")
                .description("Thống kê và báo cáo tổng hợp")
                .version("v1"));
    }
}
