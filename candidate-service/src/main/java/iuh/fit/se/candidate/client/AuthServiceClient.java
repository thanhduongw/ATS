package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.CompanyResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "auth-service", url = "${services.auth-service.url:http://localhost:8081}")
public interface AuthServiceClient {

    /** Internal — dùng bởi job dọn dữ liệu quá hạn lưu trữ (GDPR), chạy nền không qua gateway. */
    @GetMapping("/api/auth/company")
    CompanyResponse getCompany();
}
