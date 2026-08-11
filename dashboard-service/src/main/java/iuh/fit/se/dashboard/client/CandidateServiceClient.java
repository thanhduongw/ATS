package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.CandidateSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url:http://localhost:8084}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates")
    List<CandidateSummary> getCandidates();
}