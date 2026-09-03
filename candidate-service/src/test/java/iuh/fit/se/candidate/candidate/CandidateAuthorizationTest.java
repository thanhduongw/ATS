package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.client.ApplicationServiceClient;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValueRepository;
import iuh.fit.se.candidate.customfield.CustomFieldDefinitionRepository;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.security.CurrentUser;
import iuh.fit.se.candidate.storage.S3Service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateAuthorizationTest {

    @Mock private CandidateRepository candidateRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private CandidateSkillRepository candidateSkillRepository;
    @Mock private CandidateTagRepository candidateTagRepository;
    @Mock private CustomFieldDefinitionRepository customFieldDefinitionRepository;
    @Mock private CandidateCustomFieldValueRepository customFieldValueRepository;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private S3Service s3Service;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private CandidateService candidateService;

    @Test
    void candidateCannotReadAnotherCandidateProfile() {
        Candidate target = candidate(7L, 200L);
        when(candidateRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(target));
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);

        assertThrows(AccessDeniedException.class,
                () -> candidateService.getSummaryByIdForActor(7L, actor));
    }

    @Test
    void candidateCanReadOwnProfile() {
        Candidate target = candidate(7L, 100L);
        when(candidateRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(target));
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);

        assertEquals(7L, candidateService.getSummaryByIdForActor(7L, actor).id());
    }

    @Test
    void hiringManagerCannotReadCandidateOutsideDepartmentApplicationScope() {
        Candidate target = candidate(7L, 200L);
        when(candidateRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(target));
        when(applicationServiceClient.getAccessibleCandidateIds()).thenReturn(Set.of(8L));
        CurrentUser actor = new CurrentUser(300L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertThrows(AccessDeniedException.class,
                () -> candidateService.getSummaryByIdForActor(7L, actor));
    }

    @Test
    void recruiterCanReadCandidateFromAssignedApplication() {
        Candidate target = candidate(7L, 200L);
        when(candidateRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(target));
        when(applicationServiceClient.getAccessibleCandidateIds()).thenReturn(Set.of(7L));
        CurrentUser actor = new CurrentUser(400L, "recruiter@example.com", "RECRUITER", 10L);

        assertEquals(7L, candidateService.getSummaryByIdForActor(7L, actor).id());
    }

    @Test
    void companyAdminCanReadCandidateWithoutApplicationScope() {
        Candidate target = candidate(7L, 200L);
        when(candidateRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(target));
        CurrentUser actor = new CurrentUser(1L, "admin@example.com", "COMPANY_ADMIN", null);

        assertEquals(7L, candidateService.getSummaryByIdForActor(7L, actor).id());
    }

    @Test
    void candidateUploadsResumeThroughUserOwnedProfileWithoutCandidateId() {
        Candidate target = candidate(7L, 100L);
        when(candidateRepository.findByUserIdAndDeletedAtIsNull(100L))
                .thenReturn(Optional.of(target));
        when(masterDataServiceClient.getEducationLevels()).thenReturn(java.util.List.of());
        when(masterDataServiceClient.getSkills()).thenReturn(java.util.List.of());
        when(s3Service.uploadFile(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn("http://localhost/resume.pdf");
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", "resume".getBytes());

        var response = candidateService.uploadMyResume(actor, file);

        assertEquals(true, response.resumeUploaded());
        assertEquals("http://localhost/resume.pdf", target.getCvFileUrl());
    }

    private Candidate candidate(Long id, Long userId) {
        return Candidate.builder()
                .id(id)
                .userId(userId)
                .fullName("Candidate")
                .email("candidate@example.com")
                .build();
    }
}
