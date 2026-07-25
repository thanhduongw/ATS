package iuh.fit.se.recruitment.client;

import iuh.fit.se.recruitment.client.dto.UserSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "auth-service", url = "${services.auth-service.url}")
public interface AuthServiceClient {

    @GetMapping("/api/auth/users")
    List<UserSummaryResponse> getUsers(@RequestParam(value = "role", required = false) String role);
}