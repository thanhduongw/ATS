package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.CandidateSummary;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(
        name = "candidate-service",
        url = "${services.candidate-service.url:http://localhost:8084}",
        configuration = FeignClientConfig.class
)
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates")
    List<CandidateSummary> getCandidates(@RequestHeader("X-Tenant-Id") Long tenantId);
}