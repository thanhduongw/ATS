package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.JobPostingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/postings/{id}")
    JobPostingResponse getPostingById(@PathVariable Long id);
}