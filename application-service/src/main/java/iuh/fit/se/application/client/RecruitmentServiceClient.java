package iuh.fit.se.application.client;

import iuh.fit.se.application.client.dto.JobPostingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url:http://localhost:8083}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/postings/{id}")
    JobPostingResponse getPostingById(
            @PathVariable("id") Long id);

    /** API công khai (không cần người dùng) — chỉ trả tin đang tuyển. Dùng khi xử lý sự kiện. */
    @GetMapping("/api/recruitment/public/jobs/{id}")
    JobPostingResponse getPublicPosting(
            @PathVariable("id") Long id);

}
