package iuh.fit.se.dashboard.posting;

import iuh.fit.se.dashboard.posting.dto.PostingStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/postings")
@RequiredArgsConstructor
public class PostingStatsController {

    private final PostingStatsService service;

    @GetMapping("/{id}/stats")
    public ResponseEntity<PostingStatsResponse> getStats(
            @RequestHeader("X-Tenant-Id") Long tenantId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getStats(tenantId, userId, role, id));
    }
}
