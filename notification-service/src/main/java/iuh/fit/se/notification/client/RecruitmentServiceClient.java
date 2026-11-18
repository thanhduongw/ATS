package iuh.fit.se.notification.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

/** Chỉ dùng để hỏi người đang gọi có xem được yêu cầu / tin tuyển dụng không (recruitment-service tự kiểm phòng ban). */
@FeignClient(name = "recruitment-service", url = "${services.recruitment-service.url:http://localhost:8083}")
public interface RecruitmentServiceClient {

    @GetMapping("/api/recruitment/requisitions/{id}")
    Map<String, Object> getRequisition(@PathVariable("id") Long id);

    @GetMapping("/api/recruitment/postings/{id}")
    Map<String, Object> getPosting(@PathVariable("id") Long id);
}
