package iuh.fit.se.recruitment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI recruitmentServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Recruitment Service API")
                .description("Yêu cầu tuyển dụng và tin tuyển dụng")
                .version("v1"));
    }
}
