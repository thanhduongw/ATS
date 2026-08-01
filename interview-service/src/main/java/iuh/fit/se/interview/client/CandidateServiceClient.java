package iuh.fit.se.interview.client;

import iuh.fit.se.interview.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url}")
public interface CandidateServiceClient {
    @GetMapping("/api/candidate/applications/{id}")
    ApplicationSummaryResponse getApplicationById(@PathVariable Long id);
}