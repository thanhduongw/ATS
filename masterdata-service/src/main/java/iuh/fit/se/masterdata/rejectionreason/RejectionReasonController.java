package iuh.fit.se.masterdata.rejectionreason;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.rejectionreason.dto.RejectionReasonRequest;
import iuh.fit.se.masterdata.rejectionreason.dto.RejectionReasonResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/rejection-reasons")
@RequiredArgsConstructor
public class RejectionReasonController {

    private final RejectionReasonService service;

    @GetMapping
    public ResponseEntity<List<RejectionReasonResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<RejectionReasonResponse> create(
            @Valid @RequestBody RejectionReasonRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RejectionReasonResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RejectionReasonRequest req) {
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
