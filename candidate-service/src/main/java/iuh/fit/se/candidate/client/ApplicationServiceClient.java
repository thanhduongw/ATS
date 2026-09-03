package iuh.fit.se.candidate.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Set;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {

    @GetMapping("/api/application/applications/access-scope/candidate-ids")
    Set<Long> getAccessibleCandidateIds();
}
