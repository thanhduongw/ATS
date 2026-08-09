package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.client.dto.CandidateSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates")
    List<CandidateSummary> getCandidates();

    @GetMapping("/api/candidate/applications")
    List<ApplicationSummary> getApplications();
}