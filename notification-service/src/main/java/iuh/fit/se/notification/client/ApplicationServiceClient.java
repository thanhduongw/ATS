package iuh.fit.se.notification.client;

import iuh.fit.se.notification.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {
    @GetMapping("/api/application/applications/{id}/summary")
    ApplicationSummaryResponse getApplicationById(@PathVariable("id") Long id, @RequestHeader("X-Tenant-Id") Long tenantId);
}
