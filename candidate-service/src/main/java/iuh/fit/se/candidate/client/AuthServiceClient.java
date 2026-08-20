package iuh.fit.se.candidate.client;

import iuh.fit.se.candidate.client.dto.CompanyResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "auth-service", url = "${services.auth-service.url:http://localhost:8081}")
public interface AuthServiceClient {

    @GetMapping("/api/auth/public/companies/{tenantCode}")
    CompanyResponse getCompanyByTenantCode(@PathVariable("tenantCode") String tenantCode);

    /** Internal — dùng bởi job dọn dữ liệu quá hạn lưu trữ (GDPR), chạy nền không qua gateway. */
    @GetMapping("/api/auth/company")
    CompanyResponse getCompany(@RequestHeader("X-Tenant-Id") Long tenantId);
}