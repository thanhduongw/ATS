package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.PostingSummary;
import iuh.fit.se.dashboard.client.dto.RequisitionSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;

@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/requisitions")
    List<RequisitionSummary> getRequisitions();

    @GetMapping("/api/recruitment/postings")
    List<PostingSummary> getPostings();
}