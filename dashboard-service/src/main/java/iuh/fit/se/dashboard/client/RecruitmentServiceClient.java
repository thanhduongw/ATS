package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.PageResponse;
import iuh.fit.se.dashboard.client.dto.PostingSummary;
import iuh.fit.se.dashboard.client.dto.RequisitionSummary;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(
        name = "recruitment-service",
        url = "${services.recruitment-service.url:http://localhost:8083}",
        configuration = FeignClientConfig.class
)
public interface RecruitmentServiceClient {

    /** No page/size sent on purpose: dashboard aggregation needs the full tenant dataset, not one page. */
    @GetMapping("/api/recruitment/requisitions")
    PageResponse<RequisitionSummary> getRequisitions(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role);

    /** No page/size sent on purpose: dashboard aggregation needs the full tenant dataset, not one page. */
    @GetMapping("/api/recruitment/postings")
    PageResponse<PostingSummary> getPostings(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Role") String role);
}