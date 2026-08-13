package iuh.fit.se.offer.client;

import iuh.fit.se.offer.client.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.offer.client.dto.ApplicationRejectRequest;
import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "application-service", url = "${services.application-service.url:http://localhost:8089}")
public interface ApplicationServiceClient {

    @GetMapping("/api/application/applications/{id}/summary")
    ApplicationSummaryResponse getApplicationSummary(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("id") Long id
    );

    @PatchMapping("/api/application/applications/{id}/advance-stage")
    void advanceStage(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable("id") Long id,
            @RequestBody ApplicationAdvanceStageRequest req
    );

    @PatchMapping("/api/application/applications/{id}/reject")
    void reject(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader("X-User-Id") Long actorUserId,
            @RequestHeader("X-User-Role") String role,
            @PathVariable("id") Long id,
            @RequestBody ApplicationRejectRequest req
    );
}