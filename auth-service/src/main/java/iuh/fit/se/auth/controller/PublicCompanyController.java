package iuh.fit.se.auth.controller;

import iuh.fit.se.auth.dto.response.CompanyResponse;
import iuh.fit.se.auth.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/public")
@RequiredArgsConstructor
public class PublicCompanyController {

    private final CompanyService companyService;
    private final iuh.fit.se.auth.service.CareersPageService careersPageService;

    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompany() {
        return ResponseEntity.ok(companyService.getPublicCompany());
    }

    /** C01 · Trang tuyển dụng — chỉ bản ĐÃ XUẤT BẢN (A09/A10). */
    @GetMapping("/careers-page")
    public ResponseEntity<iuh.fit.se.auth.dto.response.CareersPageResponse> getCareersPage() {
        return ResponseEntity.ok(careersPageService.getPublic());
    }
}
