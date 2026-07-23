package iuh.fit.se.recruitment.client;

import iuh.fit.se.recruitment.client.dto.CatalogItemResponse;
import iuh.fit.se.recruitment.client.dto.PipelineResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/employment-types")
    List<CatalogItemResponse> getEmploymentTypes();

    @GetMapping("/api/masterdata/work-locations")
    List<CatalogItemResponse> getWorkLocations();

    @GetMapping("/api/masterdata/pipelines/{id}")
    PipelineResponse getPipelineById(@PathVariable Long id);
}