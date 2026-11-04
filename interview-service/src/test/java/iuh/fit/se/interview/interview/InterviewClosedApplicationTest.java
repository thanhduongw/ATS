package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.ApplicationClosedListener;
import iuh.fit.se.interview.event.ApplicationStatusChangedEvent;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.scheduling.InterviewSlot;
import iuh.fit.se.interview.scheduling.InterviewSlotRepository;
import iuh.fit.se.interview.scheduling.InterviewSlotStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Hồ sơ kết thúc (HR từ chối hoặc ứng viên rút đơn) → huỷ lịch còn treo. */
@ExtendWith(MockitoExtension.class)
class InterviewClosedApplicationTest {

    @Mock private InterviewRepository interviewRepository;
    @Mock private InterviewEvaluationRepository evaluationRepository;
    @Mock private InterviewSlotRepository slotRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private InterviewEventPublisher eventPublisher;
    @Mock private IcsService icsService;

    @InjectMocks private InterviewService interviewService;

    @Test
    void cancelsUpcomingInterviewsAndPendingSlotsButKeepsFinishedOnes() {
        Interview upcoming = Interview.builder().id(1L).applicationId(5L).status(InterviewStatus.CANDIDATE_CONFIRMED).build();
        Interview proposed = Interview.builder().id(2L).applicationId(5L).status(InterviewStatus.HM_RESCHEDULE_PROPOSED).build();
        Interview done = Interview.builder().id(3L).applicationId(5L).status(InterviewStatus.COMPLETED).build();
        InterviewSlot pending = InterviewSlot.builder().id(10L).applicationId(5L).status(InterviewSlotStatus.PROPOSED).build();
        InterviewSlot chosen = InterviewSlot.builder().id(11L).applicationId(5L).status(InterviewSlotStatus.SELECTED).build();
        when(interviewRepository.findByApplicationIdOrderByScheduledAtDesc(5L)).thenReturn(List.of(upcoming, proposed, done));
        when(slotRepository.findByApplicationIdOrderByStartTimeAsc(5L)).thenReturn(List.of(pending, chosen));

        int n = interviewService.cancelOpenForClosedApplication(5L);

        assertThat(n).isEqualTo(3);
        assertThat(upcoming.getStatus()).isEqualTo(InterviewStatus.CANCELLED);
        assertThat(proposed.getStatus()).isEqualTo(InterviewStatus.CANCELLED);
        assertThat(done.getStatus()).isEqualTo(InterviewStatus.COMPLETED);
        assertThat(pending.getStatus()).isEqualTo(InterviewSlotStatus.CANCELLED);
        assertThat(chosen.getStatus()).isEqualTo(InterviewSlotStatus.SELECTED);
        // Chạy từ sự kiện, không có người dùng: không gọi sang service khác.
        verifyNoInteractions(applicationServiceClient, candidateServiceClient, authServiceClient);
    }

    @Test
    void listenerOnlyReactsToRejectedStage() {
        InterviewService service = mock(InterviewService.class);
        ApplicationClosedListener listener = new ApplicationClosedListener(service);

        listener.onApplicationStatusChanged(event("TECHNICAL_INTERVIEW"));
        verify(service, never()).cancelOpenForClosedApplication(anyLong());

        listener.onApplicationStatusChanged(event("REJECTED"));
        verify(service).cancelOpenForClosedApplication(5L);
    }

    private ApplicationStatusChangedEvent event(String toType) {
        return new ApplicationStatusChangedEvent(5L, 1L, 2L, 3L, 4L, "Sàng lọc", "x", toType);
    }
}
