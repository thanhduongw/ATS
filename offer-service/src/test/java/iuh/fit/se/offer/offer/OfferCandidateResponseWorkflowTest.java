package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.CandidateServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.offer.client.dto.CandidateSummaryResponse;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.offer.dto.CandidateOfferResponse;
import iuh.fit.se.offer.offer.dto.OfferDeclineRequest;
import iuh.fit.se.offer.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * A candidate is allowed to answer their own offer, but is not allowed to move the application
 * stage. The transition is therefore published as an event; it must not be attempted through a
 * synchronous call carrying a forged "SYSTEM" role, which the downstream trusted-header filter
 * rejects and which used to roll the whole response back.
 */
@ExtendWith(MockitoExtension.class)
class OfferCandidateResponseWorkflowTest {

    private static final Long CANDIDATE_USER_ID = 100L;
    private static final Long CANDIDATE_ID = 7L;
    private static final Long APPLICATION_ID = 500L;

    @Mock private OfferRepository offerRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private OfferEventPublisher offerEventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;
    @Mock private OfferPdfService offerPdfService;

    @InjectMocks private OfferService offerService;

    @Test
    void acceptPublishesTheStageTransitionInsteadOfCallingApplicationServiceAsSystem() {
        Offer offer = approvedOffer();
        stubCandidateContext(offer);

        CandidateOfferResponse response = offerService.accept(offer.getId(), candidate());

        assertEquals(OfferStatus.ACCEPTED, offer.getStatus());
        assertEquals(OfferStatus.ACCEPTED, response.status());
        verify(offerRepository).save(offer);
        verify(offerEventPublisher).publishOfferAccepted(
                offer.getId(), APPLICATION_ID, offer.getRequesterId(),
                offer.getCandidateNameSnapshot(), CANDIDATE_USER_ID);
        // The candidate must never trigger an internal-staff directory lookup.
        verifyNoInteractions(authServiceClient);
    }

    @Test
    void declinePublishesTheRejectionWithItsReasonInsteadOfCallingApplicationServiceAsSystem() {
        Offer offer = approvedOffer();
        stubCandidateContext(offer);

        CandidateOfferResponse response = offerService.decline(
                offer.getId(), candidate(), new OfferDeclineRequest(9L, "Da nhan offer khac"));

        assertEquals(OfferStatus.DECLINED, offer.getStatus());
        assertEquals(OfferStatus.DECLINED, response.status());
        verify(offerEventPublisher).publishOfferDeclined(
                offer.getId(), APPLICATION_ID, offer.getRequesterId(),
                offer.getCandidateNameSnapshot(), "Da nhan offer khac", 9L, CANDIDATE_USER_ID);
        verifyNoInteractions(authServiceClient);
    }

    private void stubCandidateContext(Offer offer) {
        when(offerRepository.findByIdAndDeletedAtIsNull(offer.getId())).thenReturn(Optional.of(offer));
        when(applicationServiceClient.getApplicationSummary(APPLICATION_ID)).thenReturn(summary());
        when(candidateServiceClient.getByUserId(CANDIDATE_USER_ID)).thenReturn(
                new CandidateSummaryResponse(
                        CANDIDATE_ID, "Ung vien A", "a@example.com", null, null, CANDIDATE_USER_ID));
        when(masterDataServiceClient.getContractTypes()).thenReturn(List.of());
        when(masterDataServiceClient.getRejectionReasons()).thenReturn(List.of());
    }

    private CurrentUser candidate() {
        return new CurrentUser(CANDIDATE_USER_ID, "a@example.com", "CANDIDATE", null);
    }

    private Offer approvedOffer() {
        Offer offer = Offer.builder()
                .applicationId(APPLICATION_ID)
                .candidateId(CANDIDATE_ID)
                .candidateNameSnapshot("Ung vien A")
                .requesterId(60L)
                .approverId(50L)
                .departmentId(10L)
                .assignedRecruiterId(60L)
                .status(OfferStatus.APPROVED)
                .build();
        offer.setId(300L);
        return offer;
    }

    private ApplicationSummaryResponse summary() {
        return new ApplicationSummaryResponse(
                APPLICATION_ID, CANDIDATE_ID, "Ung vien A", "a@example.com",
                80L, 4L, 10L, 60L, 3, "OFFER", "Offer", null);
    }
}
