package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.client.dto.CompanyResponse;
import iuh.fit.se.recruitment.posting.dto.JobPostingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/public")
@RequiredArgsConstructor
public class PublicJobPostingController {

    private final JobPostingService jobPostingService;
    private final AuthServiceClient authServiceClient;

    /**
     * Danh sách tin đang OPEN của công ty (Career Portal), có thể lọc theo loại hình/địa điểm.
     */
    @GetMapping("/companies/{tenantCode}/jobs")
    public ResponseEntity<List<JobPostingResponse>> listOpenJobs(
            @PathVariable String tenantCode,
            @RequestParam(required = false) Long employmentTypeId,
            @RequestParam(required = false) Long workLocationId) {
        CompanyResponse company = authServiceClient.getCompanyByTenantCode(tenantCode);
        return ResponseEntity.ok(jobPostingService.getOpen(company.tenantId(), employmentTypeId, workLocationId));
    }

    /**
     * Chi tiết 1 tin OPEN.
     */
    @GetMapping("/companies/{tenantCode}/jobs/{jobId}")
    public ResponseEntity<JobPostingResponse> getOpenJob(
            @PathVariable String tenantCode,
            @PathVariable Long jobId) {
        CompanyResponse company = authServiceClient.getCompanyByTenantCode(tenantCode);
        return ResponseEntity.ok(jobPostingService.getOpenById(company.tenantId(), jobId));
    }
}