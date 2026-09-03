package iuh.fit.se.dashboard.client;

import iuh.fit.se.dashboard.client.dto.InterviewSummary;
import iuh.fit.se.dashboard.config.FeignClientConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
        name = "interview-service",
        url = "${services.interview-service.url:http://localhost:8085}",
        configuration = FeignClientConfig.class
)
public interface InterviewServiceClient {

    /** Toàn bộ buổi phỏng vấn của 1 tin đăng — dùng để suy ra trạng thái PV gần nhất theo từng hồ sơ. */
    @GetMapping("/api/interview/interviews")
    List<InterviewSummary> getInterviewsByPosting(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role,
            @RequestParam("jobPostingId") Long jobPostingId);
}
