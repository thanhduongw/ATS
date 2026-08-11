package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url:http://localhost:8084}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates/{id}/summary")
    CandidateSummaryResponse getCandidateSummary(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("id") Long id
    );
}
