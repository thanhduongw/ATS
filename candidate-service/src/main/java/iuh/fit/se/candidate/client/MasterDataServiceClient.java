package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.client.dto.PipelineResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/education-levels")
    List<CatalogItemResponse> getEducationLevels();

    @GetMapping("/api/masterdata/skills")
    List<CatalogItemResponse> getSkills();

    @GetMapping("/api/masterdata/recruitment-sources")
    List<CatalogItemResponse> getRecruitmentSources();

    @GetMapping("/api/masterdata/rejection-reasons")
    List<CatalogItemResponse> getRejectionReasons();

    @GetMapping("/api/masterdata/pipelines/{id}")
    PipelineResponse getPipelineById(@PathVariable Long id);
}