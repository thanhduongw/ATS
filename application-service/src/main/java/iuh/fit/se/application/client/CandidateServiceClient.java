package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "candidate-service", url = "${services.candidate-service.url:http://localhost:8084}")
public interface CandidateServiceClient {

    @GetMapping("/api/candidate/candidates/{id}/summary")
    CandidateSummaryResponse getCandidateSummary(
            @PathVariable("id") Long id);

    @GetMapping("/api/candidate/candidates/by-user/{userId}")
    CandidateSummaryResponse getByUserId(
            @PathVariable("userId") Long userId);

    /** Talent Pool — đánh dấu ứng viên vào pool kèm tag lý do, khi hồ sơ bị từ chối. */
    @PatchMapping("/api/candidate/candidates/{id}/mark-pool")
    void markPool(
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, String> body);
}
