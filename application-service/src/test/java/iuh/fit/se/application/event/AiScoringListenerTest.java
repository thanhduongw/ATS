package iuh.fit.se.application.event;

import iuh.fit.se.application.application.ApplicationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AiScoringListenerTest {

    private static final AiScoringCompletedEvent EVENT = new AiScoringCompletedEvent(
            7L, 5L, "COMPLETED", new BigDecimal("75.0"), "FIT", LocalDateTime.of(2026, 10, 15, 3, 0));

    @Mock private ApplicationService applicationService;

    @InjectMocks private AiScoringListener listener;

    @Test
    void eventIsAppliedToTheApplication() {
        listener.onAiScoring(EVENT);

        verify(applicationService).applyAiScore(EVENT);
    }

    @Test
    void aFailedUpdateIsLoggedAndAcknowledgedSoTheMessageIsNotRequeuedForever() {
        doThrow(new IllegalStateException("db down")).when(applicationService).applyAiScore(any());

        assertDoesNotThrow(() -> listener.onAiScoring(EVENT));
    }
}
