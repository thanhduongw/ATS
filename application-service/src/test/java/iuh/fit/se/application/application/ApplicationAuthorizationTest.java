package iuh.fit.se.application.application;

import iuh.fit.se.application.client.AuthServiceClient;
import iuh.fit.se.application.client.CandidateServiceClient;
import iuh.fit.se.application.client.MasterDataServiceClient;
import iuh.fit.se.application.client.RecruitmentServiceClient;
import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import iuh.fit.se.application.client.dto.CatalogItemResponse;
import iuh.fit.se.application.client.dto.JobPostingResponse;
import iuh.fit.se.application.client.dto.PipelineResponse;
import iuh.fit.se.application.client.dto.PipelineStageResponse;
import iuh.fit.se.application.application.dto.ApplicationCreateRequest;
import iuh.fit.se.application.event.ApplicationEventPublisher;
import iuh.fit.se.application.event.AuditEventPublisher;
import iuh.fit.se.application.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationAuthorizationTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationHistoryRepository historyRepository;
    @Mock private ApplicationCommentRepository commentRepository;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private RecruitmentServiceClient recruitmentServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private ApplicationService applicationService;

    @Test
    void candidateCannotReadAnotherCandidatesApplication() {
        Application application = application(7L, 200L, 30L, 20L, null);
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(application));
        when(candidateServiceClient.getByUserId(100L))
                .thenReturn(new CandidateSummaryResponse(100L, "A", "a@example.com", null, null));

        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);
        assertThrows(AccessDeniedException.class,
                () -> applicationService.requireAccess(7L, actor));
    }

    @Test
    void hiringManagerCannotReadAnotherDepartmentsApplication() {
        Application application = application(7L, 200L, 30L, 20L, null);
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(application));

        CurrentUser actor = new CurrentUser(300L, "hm@example.com", "HIRING_MANAGER", 10L);
        assertThrows(AccessDeniedException.class,
                () -> applicationService.requireAccess(7L, actor));
    }

    @Test
    void companyAdminCanReadEveryDepartment() {
        Application application = application(7L, 200L, 30L, 20L, null);
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(application));

        CurrentUser actor = new CurrentUser(1L, "admin@example.com", "COMPANY_ADMIN", null);
        assertDoesNotThrow(() -> applicationService.requireAccess(7L, actor));
    }

    @Test
    void assignedRecruiterCanReadApplicationFromAnotherDepartment() {
        Application application = application(7L, 200L, 30L, 20L, 400L);
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(application));

        CurrentUser actor = new CurrentUser(400L, "recruiter@example.com", "RECRUITER", 10L);
        assertDoesNotThrow(() -> applicationService.requireAccess(7L, actor));
    }

    @Test
    void candidateCannotApplyUsingAnotherCandidatesClientSuppliedId() {
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);
        when(candidateServiceClient.getByUserId(100L))
                .thenReturn(new CandidateSummaryResponse(
                        10L, "Candidate A", "a@example.com", null, "owned-resume.pdf"));
        when(candidateServiceClient.getCandidateSummary(10L))
                .thenReturn(new CandidateSummaryResponse(
                        10L, "Candidate A", "a@example.com", null, "owned-resume.pdf"));
        when(recruitmentServiceClient.getPostingById(30L))
                .thenReturn(new JobPostingResponse(30L, 40L, "OPEN", "Backend Engineer", 50L, "IT"));
        when(applicationRepository.existsByCandidateIdAndJobPostingIdAndDeletedAtIsNull(10L, 30L))
                .thenReturn(false);
        when(masterDataServiceClient.getRecruitmentSources())
                .thenReturn(List.of(new CatalogItemResponse(60L, "WEB", "Website")));
        when(masterDataServiceClient.getRejectionReasons()).thenReturn(List.of());
        when(masterDataServiceClient.getPipelineById(40L))
                .thenReturn(new PipelineResponse(
                        40L, "Default", true,
                        List.of(new PipelineStageResponse(70L, "Applied", 1, "APPLIED"))));

        AtomicReference<Application> saved = new AtomicReference<>();
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application application = invocation.getArgument(0);
            application.setId(7L);
            application.prePersist();
            saved.set(application);
            return application;
        });
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L))
                .thenAnswer(ignored -> Optional.ofNullable(saved.get()));

        var response = applicationService.createForCandidate(
                actor,
                new ApplicationCreateRequest(
                        999L, 30L, 60L, 888L, "attacker-resume.pdf", "Cover letter"));

        assertEquals(7L, response.id());
        assertEquals(10L, saved.get().getCandidateId());
        org.junit.jupiter.api.Assertions.assertNotEquals(999L, saved.get().getCandidateId());
        assertEquals(null, saved.get().getAssignedRecruiterId());
        assertEquals("owned-resume.pdf", saved.get().getResumeUrl());
    }

    private Application application(
            Long id, Long candidateId, Long postingId, Long departmentId, Long recruiterId) {
        return Application.builder()
                .id(id)
                .candidateId(candidateId)
                .candidateNameSnapshot("Candidate")
                .jobPostingId(postingId)
                .departmentId(departmentId)
                .assignedRecruiterId(recruiterId)
                .build();
    }
}
