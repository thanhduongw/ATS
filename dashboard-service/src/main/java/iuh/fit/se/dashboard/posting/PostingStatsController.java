package iuh.fit.se.dashboard.posting;

import iuh.fit.se.dashboard.posting.dto.PostingStatsResponse;
import iuh.fit.se.dashboard.security.AuthorizationPolicy;
import iuh.fit.se.dashboard.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/postings")
@RequiredArgsConstructor
public class PostingStatsController {

    private final PostingStatsService service;

    @GetMapping("/{id}/stats")
    public ResponseEntity<PostingStatsResponse> getStats(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getStats(actor.userId(), actor.role(), id));
    }
}
