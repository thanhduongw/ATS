package iuh.fit.se.masterdata.jobtitle;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleRequest;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/job-titles")
@RequiredArgsConstructor
public class JobTitleController {

    private final JobTitleService service;

    @GetMapping
    public ResponseEntity<List<JobTitleResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<JobTitleResponse> create(
            @Valid @RequestBody JobTitleRequest req) {
        AuthorizationPolicy.requireInternal(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobTitleResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody JobTitleRequest req) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}
