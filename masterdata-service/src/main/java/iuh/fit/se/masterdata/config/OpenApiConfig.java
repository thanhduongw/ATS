package iuh.fit.se.masterdata.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI masterdataServiceOpenApi() {
        return new OpenAPI().info(new Info()
                .title("MasterData Service API")
                .description("Quản lý danh mục dùng chung cho từng công ty")
                .version("v1"));
    }
}
