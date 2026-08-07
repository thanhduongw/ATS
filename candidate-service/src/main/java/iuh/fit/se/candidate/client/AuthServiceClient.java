package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.UserSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "auth-service", url = "${services.auth-service.url:http://localhost:8081}")
public interface AuthServiceClient {
    @GetMapping("/api/auth/users")
    List<UserSummaryResponse> getUsers(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestParam(value = "role", required = false) String role);
}