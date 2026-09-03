package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.common.PageResponse;
import iuh.fit.se.offer.offer.dto.*;
import iuh.fit.se.offer.security.AuthorizationPolicy;
import iuh.fit.se.offer.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offer/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService service;

    @GetMapping
    public ResponseEntity<PageResponse<OfferResponse>> getAll(
            @RequestParam(required = false) Long applicationId,
            @RequestParam(required = false) OfferStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getAll(
                actor, applicationId, status, createdFrom, createdTo, page, size));
    }

    @GetMapping("/my")
    public ResponseEntity<List<CandidateOfferResponse>> getMyOffers() {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyOffers(actor));
    }

    @GetMapping("/my/{id}")
    public ResponseEntity<CandidateOfferResponse> getMyOffer(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.getMyOffer(actor, id));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getOfferPdf(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        byte[] pdf = service.generateOfferPdf(actor, id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"offer-letter-" + id + ".pdf\"")
                .body(pdf);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OfferResponse> getById(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.getById(actor, id));
    }

    /** Chỉ HR tạo Offer */
    @PostMapping
    public ResponseEntity<OfferResponse> create(
            @Valid @RequestBody OfferCreateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.create(actor, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OfferResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody OfferUpdateRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.update(id, actor, req));
    }

    @PatchMapping("/{id}/submit")
    public ResponseEntity<OfferResponse> submit(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        return ResponseEntity.ok(service.submit(id, actor));
    }

    /** Phòng ban (approver) duyệt */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<OfferResponse> approve(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.approve(id, actor));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<OfferResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody OfferRejectRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireInternal(actor);
        return ResponseEntity.ok(service.reject(id, actor, req));
    }

    /** Candidate Accept */
    @PatchMapping("/{id}/accept")
    public ResponseEntity<CandidateOfferResponse> accept(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.accept(id, actor));
    }

    /** Candidate Decline */
    @PatchMapping("/{id}/decline")
    public ResponseEntity<CandidateOfferResponse> decline(
            @PathVariable Long id,
            @Valid @RequestBody OfferDeclineRequest req) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireCandidate(actor);
        return ResponseEntity.ok(service.decline(id, actor, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id) {
        CurrentUser actor = CurrentUser.required();
        AuthorizationPolicy.requireHr(actor);
        service.softDelete(id, actor);
        return ResponseEntity.ok(Map.of("message", "Xóa Offer thành công"));
    }
}
