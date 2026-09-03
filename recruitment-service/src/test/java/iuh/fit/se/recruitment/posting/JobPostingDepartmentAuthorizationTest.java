package iuh.fit.se.recruitment.posting;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.client.MasterDataServiceClient;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.posting.dto.JobPostingUpdateRequest;
import iuh.fit.se.recruitment.requisition.JobRequisition;
import iuh.fit.se.recruitment.requisition.JobRequisitionRepository;
import iuh.fit.se.recruitment.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobPostingDepartmentAuthorizationTest {

    @Mock private JobPostingRepository repository;
    @Mock private JobRequisitionRepository requisitionRepository;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private JobPostingService service;

    @Test
    void recruiterCannotEditUnassignedJobFromAnotherDepartment() {
        CurrentUser recruiter = new CurrentUser(
                2L, "recruiter@example.com", "RECRUITER", 10L);
        JobRequisition requisition = JobRequisition.builder()
                .id(5L)
                .departmentId(20L)
                .requesterId(30L)
                .approverId(40L)
                .build();
        JobPosting posting = JobPosting.builder()
                .id(7L)
                .requisition(requisition)
                .status(PostingStatus.DRAFT)
                .build();
        when(repository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(posting));

        assertThrows(AccessDeniedException.class,
                () -> service.update(7L, recruiter, mock(JobPostingUpdateRequest.class)));

        verifyNoInteractions(masterDataServiceClient, authServiceClient, auditEventPublisher);
    }
}
