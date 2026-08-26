package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import iuh.fit.se.application.client.dto.PublicCandidateCreateRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url:http://localhost:8084}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates/{id}/summary")
    CandidateSummaryResponse getCandidateSummary(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("id") Long id);

    @GetMapping("/api/candidate/candidates/by-user/{userId}")
    CandidateSummaryResponse getByUserId(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("userId") Long userId);

    @PostMapping("/api/candidate/public/companies/{tenantCode}/candidates")
    CandidateSummaryResponse findOrCreatePublic(
            @PathVariable("tenantCode") String tenantCode,
            @RequestBody PublicCandidateCreateRequest req);

    @PostMapping(value = "/api/candidate/public/companies/{tenantCode}/candidates/{candidateId}/cv",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    CandidateSummaryResponse uploadCvPublic(
            @PathVariable("tenantCode") String tenantCode,
            @PathVariable("candidateId") Long candidateId,
            @RequestPart("file") MultipartFile file);

    /** Talent Pool — đánh dấu ứng viên vào pool kèm tag lý do, khi hồ sơ bị từ chối. */
    @PatchMapping("/api/candidate/candidates/{id}/mark-pool")
    void markPool(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, String> body);
}