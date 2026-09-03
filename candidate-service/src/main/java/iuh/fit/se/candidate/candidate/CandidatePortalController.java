package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateSelfResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateSelfUpdateRequest;
import iuh.fit.se.candidate.security.AuthorizationPolicy;
import iuh.fit.se.candidate.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate/me")
@RequiredArgsConstructor
public class CandidatePortalController {

    private final CandidateService candidateService;

    @GetMapping
    public ResponseEntity<CandidateSelfResponse> getMyProfile() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(candidateService.getMyProfile(actor));
    }

    @PatchMapping
    public ResponseEntity<CandidateSelfResponse> updateMyProfile(
            @Valid @RequestBody CandidateSelfUpdateRequest request) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(candidateService.updateMyProfile(actor, request));
    }

    @PostMapping(value = "/resume", consumes = "multipart/form-data")
    public ResponseEntity<CandidateSelfResponse> uploadMyResume(
            @RequestParam("file") MultipartFile file) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(candidateService.uploadMyResume(actor, file));
    }

    @PostMapping("/request-deletion")
    public ResponseEntity<Map<String, String>> requestDeletion() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        candidateService.requestOwnDataDeletion(actor.userId());
        return ResponseEntity.ok(Map.of("message", "Yeu cau xoa du lieu da duoc xu ly"));
    }
}
