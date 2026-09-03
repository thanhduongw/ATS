package iuh.fit.se.interview.client;

import iuh.fit.se.interview.client.dto.UserSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;

@FeignClient(name = "auth-service", url = "${services.auth-service.url}")
public interface AuthServiceClient {
    // Internal-staff directory only: no candidate accounts, no email, no account status.
    @GetMapping("/api/auth/users/directory")
    List<UserSummaryResponse> getUsers(
            @RequestParam(value = "role", required = false) String role
    );
}