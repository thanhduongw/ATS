package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse;
import iuh.fit.se.candidate.candidate.dto.PublicCandidateCreateRequest;
import iuh.fit.se.candidate.client.AuthServiceClient;
import iuh.fit.se.candidate.client.dto.CompanyResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate/public")
@RequiredArgsConstructor
public class PublicCandidateController {

    private final CandidateService candidateService;
    private final AuthServiceClient authServiceClient;

    /**
     * Tìm hoặc tạo candidate theo email trong tenant (public apply).
     */
    @PostMapping("/companies/{tenantCode}/candidates")
    public ResponseEntity<CandidateSummaryResponse> findOrCreate(
            @PathVariable String tenantCode,
            @Valid @RequestBody PublicCandidateCreateRequest req) {
        CompanyResponse company = authServiceClient.getCompanyByTenantCode(tenantCode);
        return ResponseEntity.ok(candidateService.findOrCreatePublic(company.tenantId(), req));
    }

    /**
     * Upload CV cho candidate (public apply).
     */
    @PostMapping(value = "/companies/{tenantCode}/candidates/{candidateId}/cv", consumes = "multipart/form-data")
    public ResponseEntity<CandidateSummaryResponse> uploadCv(
            @PathVariable String tenantCode,
            @PathVariable Long candidateId,
            @RequestParam("file") MultipartFile file) {
        CompanyResponse company = authServiceClient.getCompanyByTenantCode(tenantCode);
        return ResponseEntity.ok(candidateService.uploadCvPublic(company.tenantId(), candidateId, file));
    }
}