package iuh.fit.se.interview.interview;

import iuh.fit.se.interview.client.ApplicationServiceClient;
import iuh.fit.se.interview.client.AuthServiceClient;
import iuh.fit.se.interview.client.CandidateServiceClient;
import iuh.fit.se.interview.client.MasterDataServiceClient;
import iuh.fit.se.interview.evaluation.InterviewEvaluationRepository;
import iuh.fit.se.interview.event.InterviewEventPublisher;
import iuh.fit.se.interview.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import java.util.Optional;
import iuh.fit.se.interview.client.dto.CandidateSummaryResponse;

@ExtendWith(MockitoExtension.class)
class InterviewDepartmentAuthorizationTest {

    @Mock private InterviewRepository interviewRepository;
    @Mock private InterviewEvaluationRepository evaluationRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private InterviewEventPublisher eventPublisher;
    @Mock private IcsService icsService;

    @InjectMocks private InterviewService interviewService;

    @Test
    void hiringManagerCannotViewOtherDepartmentUnlessAssigned() {
        CurrentUser actor = new CurrentUser(50L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertThrows(AccessDeniedException.class,
                () -> interviewService.requireCanView(interview(20L, 90L, null), actor));
        assertDoesNotThrow(
                () -> interviewService.requireCanView(interview(20L, 90L, 50L), actor));
    }

    @Test
    void recruiterCanViewOwnDepartmentOrAssignedApplication() {
        CurrentUser actor = new CurrentUser(60L, "recruiter@example.com", "RECRUITER", 10L);

        assertDoesNotThrow(
                () -> interviewService.requireCanView(interview(10L, 90L, null), actor));
        assertDoesNotThrow(
                () -> interviewService.requireCanView(interview(20L, 60L, null), actor));
        assertThrows(AccessDeniedException.class,
                () -> interviewService.requireCanView(interview(20L, 90L, null), actor));
    }

    @Test
    void candidateCannotReadAnotherCandidatesInterview() {
        Interview other = Interview.builder().id(9L).candidateId(200L).build();
        when(interviewRepository.findById(9L)).thenReturn(Optional.of(other));
        when(candidateServiceClient.getByUserId(100L))
                .thenReturn(new CandidateSummaryResponse(100L, "A", "a@example.com", null, null));
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);

        assertThrows(AccessDeniedException.class,
                () -> interviewService.getMyInterview(actor, 9L));
    }

    private Interview interview(Long departmentId, Long assignedRecruiterId, Long interviewerId) {
        Interview interview = Interview.builder()
                .departmentId(departmentId)
                .assignedRecruiterId(assignedRecruiterId)
                .build();
        if (interviewerId != null) {
            interview.getInterviewers().add(InterviewInterviewer.builder()
                    .interview(interview)
                    .interviewerId(interviewerId)
                    .build());
        }
        return interview;
    }
}
