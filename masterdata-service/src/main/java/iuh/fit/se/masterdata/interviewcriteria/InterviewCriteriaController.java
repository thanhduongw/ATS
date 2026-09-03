package iuh.fit.se.masterdata.interviewcriteria;

import iuh.fit.se.masterdata.security.AuthorizationPolicy;
import iuh.fit.se.masterdata.security.CurrentUser;
import iuh.fit.se.masterdata.interviewcriteria.dto.InterviewCriteriaRequest;
import iuh.fit.se.masterdata.interviewcriteria.dto.InterviewCriteriaResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/masterdata/interview-criteria")
@RequiredArgsConstructor
public class InterviewCriteriaController {

    private final InterviewCriteriaService service;

    @GetMapping
    public ResponseEntity<List<InterviewCriteriaResponse>> getAll(
            ) {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<InterviewCriteriaResponse> create(
            @Valid @RequestBody InterviewCriteriaRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InterviewCriteriaResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody InterviewCriteriaRequest req) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        AuthorizationPolicy.requireAdmin(CurrentUser.required());
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa tiêu chí đánh giá thành công"));
    }
}
