package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.ApplicationSummary;
import iuh.fit.se.dashboard.client.dto.PageResponse;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;

@FeignClient(
        name = "application-service",
        url = "${services.application-service.url:http://localhost:8089}",
        configuration = FeignClientConfig.class
)
public interface ApplicationServiceClient {

    /** No page/size sent on purpose: dashboard aggregation needs the full tenant dataset, not one page. */
    @GetMapping("/api/application/applications")
    PageResponse<ApplicationSummary> getApplications(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate appliedTo);
}