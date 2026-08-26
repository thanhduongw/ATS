package iuh.fit.se.interview.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI interviewServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Interview Service API")
                .description("Lịch phỏng vấn, hội đồng và đánh giá")
                .version("v1"));
    }
}
