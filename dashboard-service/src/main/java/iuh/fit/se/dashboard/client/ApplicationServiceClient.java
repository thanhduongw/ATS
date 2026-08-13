package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(
        name = "application-service",
        url = "${services.application-service.url:http://localhost:8089}",
        configuration = FeignClientConfig.class
)
public interface ApplicationServiceClient {

    @GetMapping("/api/application/applications")
    List<ApplicationSummary> getApplications(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role);
}