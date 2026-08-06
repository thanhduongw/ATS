package iuh.fit.se.notification.client;

import iuh.fit.se.notification.client.dto.InterviewResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "interview-service", url = "${services.interview-service.url}")
public interface InterviewServiceClient {
    @GetMapping("/api/interview/interviews/{id}")
    InterviewResponse getInterviewById(@PathVariable Long id, @RequestHeader("X-Tenant-Id") Long tenantId);
}