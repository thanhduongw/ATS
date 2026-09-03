package iuh.fit.se.notification.client;

import iuh.fit.se.notification.client.dto.EmailTemplateResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "masterdata-service", url = "${services.masterdata-service.url:http://localhost:8082}")
public interface MasterDataServiceClient {
    @GetMapping("/api/masterdata/email-templates/by-code/{code}")
    EmailTemplateResponse getByCode(
            @PathVariable("code") String code);
}
