package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.JobPostingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url:http://localhost:8083}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/postings/{id}")
    JobPostingResponse getPostingById(@RequestHeader("X-Tenant-Id") Long tenantId, @PathVariable("id") Long id);
}
