package iuh.fit.se.masterdata.recruitmentstatus;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.recruitmentstatus.dto.RecruitmentStatusRequest;
import iuh.fit.se.masterdata.recruitmentstatus.dto.RecruitmentStatusResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/recruitment-statuses")
@RequiredArgsConstructor
public class RecruitmentStatusController {

    private final RecruitmentStatusService service;

    @GetMapping
    public ResponseEntity<List<RecruitmentStatusResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<RecruitmentStatusResponse> create(
            @Valid @RequestBody RecruitmentStatusRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecruitmentStatusResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RecruitmentStatusRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thành công"));
    }
}
