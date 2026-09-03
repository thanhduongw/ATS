package iuh.fit.se.application.event;

import iuh.fit.se.application.application.ApplicationService;
import iuh.fit.se.application.application.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.application.application.dto.ApplicationRejectRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

/**
 * The candidate answering an offer owns the offer but cannot call the stage APIs, so this service
 * applies the transition from the published event instead of trusting a forged "SYSTEM" caller.
 */
@ExtendWith(MockitoExtension.class)
class OfferOutcomeListenerTest {

    @Mock private ApplicationService applicationService;

    @InjectMocks private OfferOutcomeListener listener;

    @Test
    void acceptedOfferAdvancesTheApplicationOnBehalfOfTheCandidate() {
        listener.onOfferAccepted(new OfferAcceptedEvent(300L, 500L, 60L, "Ung vien A", 100L));

        ArgumentCaptor<ApplicationAdvanceStageRequest> request =
                ArgumentCaptor.forClass(ApplicationAdvanceStageRequest.class);
        verify(applicationService).applyAdvanceStage(eq(500L), eq(100L), request.capture());
        assertEquals("Ứng viên đã chấp nhận Offer", request.getValue().note());
    }

    @Test
    void declinedOfferRejectsTheApplicationWithTheSubmittedReason() {
        listener.onOfferDeclined(new OfferDeclinedEvent(
                300L, 500L, 60L, "Ung vien A", "Da nhan offer khac", 9L, 100L));

        ArgumentCaptor<ApplicationRejectRequest> request =
                ArgumentCaptor.forClass(ApplicationRejectRequest.class);
        verify(applicationService).applyReject(eq(500L), eq(100L), request.capture());
        assertEquals(9L, request.getValue().rejectionReasonId());
        assertEquals("Ứng viên từ chối Offer: Da nhan offer khac",
                request.getValue().note());
    }

    @Test
    void aFailedTransitionIsLoggedAndAcknowledgedSoTheMessageIsNotRequeuedForever() {
        doThrow(new IllegalStateException("downstream unavailable"))
                .when(applicationService).applyAdvanceStage(any(), any(), any());

        assertDoesNotThrow(() -> listener.onOfferAccepted(
                new OfferAcceptedEvent(300L, 500L, 60L, "Ung vien A", 100L)));
    }
}
