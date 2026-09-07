package iuh.fit.se.offer.client;

import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {

    @GetMapping("/api/application/applications/{id}/summary")
    ApplicationSummaryResponse getApplicationSummary(
            @PathVariable("id") Long id
    );
}
