package iuh.fit.se.offer.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI offerServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Offer Service API")
                .description("Thư mời nhận việc")
                .version("v1"));
    }
}
