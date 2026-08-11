package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url:http://localhost:8082}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/education-levels")
    List<CatalogItemResponse> getEducationLevels(@RequestHeader("X-Tenant-Id") Long tenantId);

    @GetMapping("/api/masterdata/skills")
    List<CatalogItemResponse> getSkills(@RequestHeader("X-Tenant-Id") Long tenantId);
}