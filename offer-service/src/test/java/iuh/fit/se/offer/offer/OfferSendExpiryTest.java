package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.CandidateServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.RecruitmentServiceClient;
import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.offer.client.dto.CandidateSummaryResponse;
import iuh.fit.se.offer.exception.BusinessException;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Gửi thư mời thẳng (B2), hết hạn phản hồi (B4), đếm lượt xem (Q3) — và các cột DB bắt buộc
 * của migration V5/V7: thư đã gửi/đã trả lời/hết hạn phải có issued_at + sealed_at, thư đã trả lời
 * phải có candidate_responded_at, thư hết hạn phải có expired_at.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OfferSendExpiryTest {

    private static final Long APPLICATION_ID = 500L;
    private static final Long CANDIDATE_USER_ID = 100L;

    @Mock private OfferRepository offerRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private RecruitmentServiceClient recruitmentServiceClient;
    @Mock private OfferEventPublisher offerEventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;
    @Mock private OfferPdfService offerPdfService;

    @InjectMocks private OfferService offerService;

    @Test
    void sendMovesDraftStraightToSentAndSealsTheTerms() {
        Offer offer = offer(OfferStatus.DRAFT);
        stub(offer);

        offerService.send(offer.getId(), recruiter());

        assertThat(offer.getStatus()).isEqualTo(OfferStatus.APPROVED);
        assertThat(offer.getApprovedAt()).isNotNull();
        assertThat(offer.getIssuedAt()).isNotNull();
        assertThat(offer.getSealedAt()).isNotNull();
        assertThat(offer.getApproverId()).isEqualTo(60L);
        verify(offerEventPublisher).publishOfferApproved(offer.getId(), APPLICATION_ID, 60L, 7L);
    }

    @Test
    void sendRejectsAnOfferThatIsNotADraft() {
        Offer offer = offer(OfferStatus.PENDING_APPROVAL);
        stub(offer);

        assertThrows(BusinessException.class, () -> offerService.send(offer.getId(), recruiter()));
        verify(offerRepository, never()).save(any());
    }

    @Test
    void sendRejectsAPastDeadline() {
        Offer offer = offer(OfferStatus.DRAFT);
        offer.setResponseDeadline(LocalDateTime.now().minusHours(1));
        stub(offer);

        assertThrows(BusinessException.class, () -> offerService.send(offer.getId(), recruiter()));
    }

    @Test
    void acceptRecordsWhoAnsweredAndSealsALegacyUnsealedOffer() {
        Offer offer = offer(OfferStatus.APPROVED); // gửi trước khi có niêm phong: sealedAt null
        stub(offer);

        offerService.accept(offer.getId(), candidate());

        assertThat(offer.getStatus()).isEqualTo(OfferStatus.ACCEPTED);
        assertThat(offer.getCandidateRespondedAt()).isNotNull();
        assertThat(offer.getCandidateRespondedByUserId()).isEqualTo(CANDIDATE_USER_ID);
        assertThat(offer.getSealedAt()).isNotNull();
        assertThat(offer.getIssuedAt()).isNotNull();
    }

    @Test
    void declineAfterDeadlineIsRefused() {
        Offer offer = offer(OfferStatus.APPROVED);
        offer.setResponseDeadline(LocalDateTime.now().minusMinutes(5));
        stub(offer);

        assertThrows(BusinessException.class, () -> offerService.decline(
                offer.getId(), candidate(), new iuh.fit.se.offer.offer.dto.OfferDeclineRequest(9L, null)));
    }

    @Test
    void expireOverdueMarksSentOffersExpiredWithTimestamp() {
        Offer due = offer(OfferStatus.APPROVED);
        due.setResponseDeadline(LocalDateTime.of(2026, 10, 30, 17, 0));
        LocalDateTime now = LocalDateTime.of(2026, 10, 30, 17, 5);
        when(offerRepository.findByStatusAndResponseDeadlineBeforeAndDeletedAtIsNull(OfferStatus.APPROVED, now))
                .thenReturn(List.of(due));

        int n = offerService.expireOverdue(now);

        assertThat(n).isEqualTo(1);
        assertThat(due.getStatus()).isEqualTo(OfferStatus.EXPIRED);
        assertThat(due.getExpiredAt()).isEqualTo(now);
        assertThat(due.getSealedAt()).isNotNull();
        verify(offerRepository).save(due);
    }

    @Test
    void candidateViewIsCountedOnlyWhileAwaitingAnswer() {
        Offer sent = offer(OfferStatus.APPROVED);
        OfferService.recordCandidateView(sent);
        OfferService.recordCandidateView(sent);
        assertThat(sent.getCandidateViewCount()).isEqualTo(2);
        assertThat(sent.getCandidateLastViewedAt()).isNotNull();

        Offer answered = offer(OfferStatus.ACCEPTED);
        OfferService.recordCandidateView(answered);
        assertThat(answered.getCandidateViewCount()).isZero();
    }

    @Test
    void sealIsIdempotent() {
        Offer offer = offer(OfferStatus.APPROVED);
        OfferService.seal(offer);
        OffsetDateTime first = offer.getSealedAt();
        LocalDateTime issued = offer.getIssuedAt();

        OfferService.seal(offer);

        assertThat(offer.getSealedAt()).isEqualTo(first);
        assertThat(offer.getIssuedAt()).isEqualTo(issued);
    }

    private void stub(Offer offer) {
        when(offerRepository.findByIdAndDeletedAtIsNull(offer.getId())).thenReturn(Optional.of(offer));
        when(applicationServiceClient.getApplicationSummary(APPLICATION_ID)).thenReturn(new ApplicationSummaryResponse(
                APPLICATION_ID, 7L, "Ung vien A", "a@example.com",
                80L, 4L, 10L, 60L, 3, "OFFER", "Offer", null));
        when(candidateServiceClient.getByUserId(CANDIDATE_USER_ID)).thenReturn(new CandidateSummaryResponse(
                7L, "Ung vien A", "a@example.com", null, null, CANDIDATE_USER_ID));
        when(masterDataServiceClient.getContractTypes()).thenReturn(List.of());
        when(masterDataServiceClient.getRejectionReasons()).thenReturn(List.of());
        when(authServiceClient.getUsers(null)).thenReturn(List.of());
    }

    private CurrentUser recruiter() {
        return new CurrentUser(60L, "hr@example.com", "RECRUITER", 1L);
    }

    private CurrentUser candidate() {
        return new CurrentUser(CANDIDATE_USER_ID, "a@example.com", "CANDIDATE", null);
    }

    private Offer offer(OfferStatus status) {
        Offer offer = Offer.builder()
                .applicationId(APPLICATION_ID)
                .candidateId(7L)
                .candidateNameSnapshot("Ung vien A")
                .requesterId(60L)
                .approverId(50L)
                .departmentId(10L)
                .assignedRecruiterId(60L)
                .status(status)
                .build();
        offer.setId(300L);
        return offer;
    }
}
