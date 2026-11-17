package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.client.dto.CandidateSummaryResponse;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.InterviewCancelledEvent;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.interview.dto.CandidateInterviewResponse;
import iuh.fit.se.interview.interview.dto.InterviewUpdateRequest;
import iuh.fit.se.interview.scheduling.InterviewSlotRepository;
import iuh.fit.se.interview.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Huỷ / đổi giờ buổi phỏng vấn: ai được báo, và ứng viên thấy buổi đã huỷ khi nào. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewCancelNotificationTest {

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

    private final CurrentUser hr = new CurrentUser(2L, "tran.ha@example.com", "RECRUITER", null);

    @BeforeEach
    void setUp() {
        when(interviewRepository.save(any(Interview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(evaluationRepository.findByInterviewId(any())).thenReturn(List.of());
    }

    private Interview interview(Long id, InterviewStatus status, LocalDateTime hmConfirmedAt) {
        Interview interview = Interview.builder().id(id).applicationId(23L).candidateId(21L)
                .candidateNameSnapshot("Trương Thị Mỹ Linh").status(status)
                .scheduledAt(LocalDateTime.now().plusDays(3)).durationMinutes(60)
                .format(InterviewFormat.OFFLINE).workLocationId(1L).hmConfirmedAt(hmConfirmedAt).build();
        for (long interviewerId : new long[] {6L, 2L}) {
            interview.getInterviewers().add(InterviewInterviewer.builder()
                    .interview(interview).interviewerId(interviewerId).interviewerNameSnapshot("Người " + interviewerId).build());
        }
        when(interviewRepository.findById(id)).thenReturn(Optional.of(interview));
        return interview;
    }

    private InterviewCancelledEvent publishedCancel() {
        ArgumentCaptor<InterviewCancelledEvent> captor = ArgumentCaptor.forClass(InterviewCancelledEvent.class);
        verify(eventPublisher).publishInterviewCancelled(captor.capture());
        return captor.getValue();
    }

    @Test
    void cancellingBeforeDepartmentConfirmedTellsInterviewersButNotCandidate() {
        interview(12L, InterviewStatus.SCHEDULED, null);

        interviewService.cancel(hr, 12L);

        InterviewCancelledEvent event = publishedCancel();
        assertThat(event.interviewerIds()).containsExactly(6L, 2L);
        assertThat(event.actorUserId()).isEqualTo(2L);
        assertThat(event.candidateNotified()).isFalse();
    }

    @Test
    void cancellingConfirmedInterviewAlsoTellsCandidate() {
        interview(14L, InterviewStatus.CANDIDATE_CONFIRMED, LocalDateTime.now().minusDays(1));

        interviewService.cancel(hr, 14L);

        assertThat(publishedCancel().candidateNotified()).isTrue();
    }

    @Test
    void candidateOnlySeesCancelledInterviewsThatWereAnnouncedToThem() {
        Interview neverAnnounced = interview(12L, InterviewStatus.CANCELLED, null);
        Interview announced = interview(11L, InterviewStatus.CANCELLED, LocalDateTime.now().minusDays(5));
        when(candidateServiceClient.getByUserId(30L))
                .thenReturn(new CandidateSummaryResponse(21L, "Trương Thị Mỹ Linh", "truong.linh@example.com", null, null));
        when(interviewRepository.findByCandidateIdOrderByScheduledAtDesc(21L)).thenReturn(List.of(neverAnnounced, announced));

        List<CandidateInterviewResponse> mine = interviewService.getMyInterviews(
                new CurrentUser(30L, "truong.linh@example.com", "CANDIDATE", null));

        assertThat(mine).extracting(CandidateInterviewResponse::id).containsExactly(11L);
    }

    @Test
    void reschedulingBeforeDepartmentConfirmedAsksInterviewersAgain() {
        Interview interview = interview(12L, InterviewStatus.SCHEDULED, null);
        LocalDateTime newTime = LocalDateTime.now().plusDays(4).withHour(15).withMinute(0).withSecond(0).withNano(0);

        interviewService.update(hr, 12L,
                new InterviewUpdateRequest(newTime, 60, InterviewFormat.ONLINE, null, "https://meet.google.com/abc-defg-hij", null));

        verify(eventPublisher).publishInterviewScheduled(12L, 23L, newTime);
        assertThat(interview.getStatus()).isEqualTo(InterviewStatus.SCHEDULED);
    }
}
