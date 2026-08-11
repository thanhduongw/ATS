package iuh.fit.se.offer.client;

import iuh.fit.se.offer.client.dto.CatalogItemResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url:http://localhost:8082}")
public interface MasterDataServiceClient {

    @GetMapping("/api/masterdata/rejection-reasons")
    List<CatalogItemResponse> getRejectionReasons(@RequestHeader("X-Tenant-Id") Long tenantId);

    @GetMapping("/api/masterdata/contract-types")
    List<CatalogItemResponse> getContractTypes(@RequestHeader("X-Tenant-Id") Long tenantId);
}
