package iuh.fit.se.interview.client;

import iuh.fit.se.interview.client.dto.CatalogItemResponse;
import iuh.fit.se.interview.client.dto.PipelineResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/pipelines/{id}")
    PipelineResponse getPipelineById(@PathVariable Long id);

    @GetMapping("/api/masterdata/interview-criteria")
    List<CatalogItemResponse> getInterviewCriteria();
}