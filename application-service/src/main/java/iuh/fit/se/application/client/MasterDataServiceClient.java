package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.CatalogItemResponse;
import iuh.fit.se.application.client.dto.PipelineResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url:http://localhost:8082}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/recruitment-sources")
    List<CatalogItemResponse> getRecruitmentSources();

    @GetMapping("/api/masterdata/rejection-reasons")
    List<CatalogItemResponse> getRejectionReasons();

    @GetMapping("/api/masterdata/pipelines/{id}")
    PipelineResponse getPipelineById(@PathVariable("id") Long id);
}
