package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {
    @GetMapping("/api/application/applications")
    List<ApplicationSummary> getApplications();
}
