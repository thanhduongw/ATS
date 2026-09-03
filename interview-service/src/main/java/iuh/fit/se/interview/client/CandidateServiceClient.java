package iuh.fit.se.interview.client;

import iuh.fit.se.interview.client.dto.CandidateSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url:http://localhost:8084}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates/by-user/{userId}")
    CandidateSummaryResponse getByUserId(
            @PathVariable("userId") Long userId);
}