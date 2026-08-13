package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/public")
@RequiredArgsConstructor
public class PublicCompanyController {

    private final CompanyService companyService;

    /**
     * Career Portal: lấy thông tin công ty theo mã (tenantCode).
     * Chỉ trả về nếu tenant ACTIVE.
     */
    @GetMapping("/companies/{tenantCode}")
    public ResponseEntity<CompanyResponse> getByTenantCode(@PathVariable String tenantCode) {
        return ResponseEntity.ok(companyService.getPublicByTenantCode(tenantCode));
    }
}