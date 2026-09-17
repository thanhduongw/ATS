package iuh.fit.se.masterdata.recruitmentsource;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.recruitmentsource.dto.RecruitmentSourceRequest;
import iuh.fit.se.masterdata.recruitmentsource.dto.RecruitmentSourceResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/recruitment-sources")
@RequiredArgsConstructor
public class RecruitmentSourceController {

    private final RecruitmentSourceService service;

    @GetMapping
    public ResponseEntity<List<RecruitmentSourceResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<RecruitmentSourceResponse> create(
            @Valid @RequestBody RecruitmentSourceRequest req) {
        AuthorizationPolicy.requireHr(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecruitmentSourceResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RecruitmentSourceRequest req) {
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
