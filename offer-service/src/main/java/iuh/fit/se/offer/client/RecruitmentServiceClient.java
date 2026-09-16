package iuh.fit.se.offer.client;

import iuh.fit.se.offer.client.dto.JobPostingSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url:http://localhost:8083}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/postings/{id}")
    JobPostingSummaryResponse getPosting(@PathVariable("id") Long id);
}
