package iuh.fit.se.interview.client;

import iuh.fit.se.interview.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {
    @GetMapping("/api/application/applications/{id}/summary")
    ApplicationSummaryResponse getApplicationById(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("id") Long id
    );
}
