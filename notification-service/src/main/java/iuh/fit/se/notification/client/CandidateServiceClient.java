package iuh.fit.se.notification.client;

import iuh.fit.se.notification.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url}")
public interface CandidateServiceClient {
    @GetMapping("/api/candidate/applications/{id}")
    ApplicationSummaryResponse getApplicationById(@PathVariable Long id);
}