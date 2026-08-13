package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.PostingSummary;
import iuh.fit.se.dashboard.client.dto.RequisitionSummary;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(
        name = "recruitment-service",
        url = "${services.recruitment-service.url:http://localhost:8083}",
        configuration = FeignClientConfig.class
)
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/requisitions")
    List<RequisitionSummary> getRequisitions(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role);

    @GetMapping("/api/recruitment/postings")
    List<PostingSummary> getPostings(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role);
}