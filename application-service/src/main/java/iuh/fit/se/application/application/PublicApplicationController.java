package iuh.fit.se.application.application;

import iuh.fit.se.application.application.dto.PublicApplyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/application/public")
@RequiredArgsConstructor
public class PublicApplicationController {

    private final ApplicationService applicationService;

    /**
     * Ứng viên nộp CV công khai (Career Portal).
     * multipart: fullName, email, phone (optional), note (optional), file (CV)
     */
    @PostMapping(value = "/companies/{tenantCode}/jobs/{jobId}/apply",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PublicApplyResponse> apply(
            @PathVariable String tenantCode,
            @PathVariable Long jobId,
            @RequestParam("fullName") String fullName,
            @RequestParam("email") String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(
                applicationService.createPublicApply(tenantCode, jobId, fullName, email, phone, note, file)
        );
    }
}