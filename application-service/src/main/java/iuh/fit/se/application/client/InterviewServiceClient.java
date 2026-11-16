package iuh.fit.se.application.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;
import java.util.List;

/** Chỉ dùng để kiểm tra hồ sơ đã có đánh giá được nộp chưa trước khi chuyển sang giai đoạn Thư mời. */
@FeignClient(name = "interview-service", url = "${services.interview-service.url:http://localhost:8085}")
public interface InterviewServiceClient {

    @GetMapping("/api/interview/applications/{applicationId}/evaluations")
    List<EvaluationSummary> getEvaluations(@PathVariable("applicationId") Long applicationId);

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EvaluationSummary(Long id, LocalDateTime submittedAt) {}
}
