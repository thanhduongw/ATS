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

    @GetMapping("/company")
    public ResponseEntity<CompanyResponse> getCompany() {
        return ResponseEntity.ok(companyService.getPublicCompany());
    }
}
