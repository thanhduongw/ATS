package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.posting.dto.JobPostingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/public")
@RequiredArgsConstructor
public class PublicJobPostingController {

    private final JobPostingService jobPostingService;

    @GetMapping("/jobs")
    public ResponseEntity<List<JobPostingResponse>> listOpenJobs(
            @RequestParam(required = false) Long employmentTypeId,
            @RequestParam(required = false) Long workLocationId) {
        return ResponseEntity.ok(jobPostingService.getOpen(employmentTypeId, workLocationId));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<JobPostingResponse> getOpenJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(jobPostingService.getOpenById(jobId));
    }
}
