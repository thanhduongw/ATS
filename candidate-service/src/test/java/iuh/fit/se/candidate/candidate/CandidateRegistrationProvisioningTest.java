package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValueRepository;
import iuh.fit.se.candidate.customfield.CustomFieldDefinitionRepository;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.event.CandidateRegisteredEvent;
import iuh.fit.se.candidate.storage.S3Service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateRegistrationProvisioningTest {

    @Mock private CandidateRepository candidateRepository;
    @Mock private CandidateSkillRepository candidateSkillRepository;
    @Mock private CandidateTagRepository candidateTagRepository;
    @Mock private CustomFieldDefinitionRepository customFieldDefinitionRepository;
    @Mock private CandidateCustomFieldValueRepository customFieldValueRepository;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private S3Service s3Service;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks
    private CandidateService candidateService;

    @Test
    void provisionsSingleCompanyCandidateProfileLinkedToUser() {
        CandidateRegisteredEvent event = new CandidateRegisteredEvent(
                42L, "Candidate", "candidate@example.com", "0900000000");
        when(candidateRepository.findByUserIdAndDeletedAtIsNull(42L))
                .thenReturn(Optional.empty());
        when(candidateRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(
                "candidate@example.com"))
                .thenReturn(Optional.empty());
        when(candidateRepository.save(any(Candidate.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        candidateService.provisionRegisteredCandidate(event);

        ArgumentCaptor<Candidate> candidateCaptor = ArgumentCaptor.forClass(Candidate.class);
        verify(candidateRepository).save(candidateCaptor.capture());
        Candidate candidate = candidateCaptor.getValue();
        assertEquals(42L, candidate.getUserId());
        assertEquals("Candidate", candidate.getFullName());
        assertEquals("candidate@example.com", candidate.getEmail());
        assertEquals("0900000000", candidate.getPhone());
    }

    @Test
    void duplicateEventIsIdempotentByUserId() {
        CandidateRegisteredEvent event = new CandidateRegisteredEvent(
                42L, "Candidate", "candidate@example.com", null);
        Candidate existing = Candidate.builder()
                .id(7L)
                .userId(42L)
                .fullName("Candidate")
                .email("candidate@example.com")
                .build();
        when(candidateRepository.findByUserIdAndDeletedAtIsNull(42L))
                .thenReturn(Optional.of(existing));

        Candidate result = candidateService.provisionRegisteredCandidate(event);

        assertEquals(7L, result.getId());
        verify(candidateRepository, never()).save(any());
    }
}
