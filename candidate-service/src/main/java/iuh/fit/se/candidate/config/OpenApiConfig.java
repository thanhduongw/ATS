package iuh.fit.se.candidate.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI candidateServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Candidate Service API")
                .description("Hồ sơ ứng viên và kỹ năng")
                .version("v1"));
    }
}
