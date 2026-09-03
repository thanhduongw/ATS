package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.event.RequisitionEventPublisher;
import iuh.fit.se.recruitment.requisition.dto.JobRequisitionCreateRequest;
import iuh.fit.se.recruitment.requisition.dto.JobRequisitionUpdateRequest;
import iuh.fit.se.recruitment.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobRequisitionDepartmentAuthorizationTest {

    @Mock private JobRequisitionRepository repository;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private RequisitionEventPublisher requisitionEventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private JobRequisitionService service;

    private final CurrentUser manager =
            new CurrentUser(30L, "manager@example.com", "HIRING_MANAGER", 10L);

    @Test
    void hiringManagerCannotCreateRequisitionForAnotherDepartment() {
        JobRequisitionCreateRequest request = org.mockito.Mockito.mock(JobRequisitionCreateRequest.class);
        when(request.departmentId()).thenReturn(20L);

        assertThrows(AccessDeniedException.class,
                () -> service.create(manager, request));
    }

    @Test
    void hiringManagerCannotMoveOwnedRequisitionToAnotherDepartment() {
        JobRequisition requisition = JobRequisition.builder()
                .id(7L)
                .departmentId(10L)
                .requesterId(manager.userId())
                .status(RequisitionStatus.DRAFT)
                .build();
        JobRequisitionUpdateRequest request = org.mockito.Mockito.mock(JobRequisitionUpdateRequest.class);
        when(repository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(requisition));
        when(request.departmentId()).thenReturn(20L);

        assertThrows(AccessDeniedException.class,
                () -> service.update(7L, manager, request));
    }

    @Test
    void hiringManagerCannotApproveRequisitionEvenWhenAssignedAsApprover() {
        JobRequisition requisition = JobRequisition.builder()
                .id(7L)
                .departmentId(20L)
                .requesterId(99L)
                .approverId(manager.userId())
                .status(RequisitionStatus.PENDING_APPROVAL)
                .build();
        when(repository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(requisition));

        assertThrows(AccessDeniedException.class,
                () -> service.approve(7L, manager, null));
    }
}
