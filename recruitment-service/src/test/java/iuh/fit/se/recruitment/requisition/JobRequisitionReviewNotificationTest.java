package iuh.fit.se.recruitment.requisition;

import iuh.fit.se.recruitment.client.AuthServiceClient;
import iuh.fit.se.recruitment.event.AuditEventPublisher;
import iuh.fit.se.recruitment.event.RequisitionEventPublisher;
import iuh.fit.se.recruitment.event.RequisitionReviewedEvent;
import iuh.fit.se.recruitment.requisition.dto.JobRequisitionRejectRequest;
import iuh.fit.se.recruitment.requisition.dto.JobRequisitionRequestChangesRequest;
import iuh.fit.se.recruitment.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Duyệt / từ chối / yêu cầu sửa một yêu cầu tuyển dụng thì báo cho người lập (đại diện phòng ban). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobRequisitionReviewNotificationTest {

    @Mock private JobRequisitionRepository repository;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private RequisitionEventPublisher requisitionEventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;

    @InjectMocks private JobRequisitionService service;

    private final CurrentUser recruiter = new CurrentUser(2L, "tran.ha@example.com", "RECRUITER", null);

    @BeforeEach
    void setUp() {
        JobRequisition requisition = JobRequisition.builder()
                .id(7L).departmentId(6L).requesterId(9L).title("Kỹ sư AI/Machine Learning")
                .status(RequisitionStatus.PENDING_APPROVAL).build();
        when(repository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(requisition));
        when(repository.save(any(JobRequisition.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void changeRequestIsSentToTheRequester() {
        service.requestChanges(7L, recruiter, new JobRequisitionRequestChangesRequest("Bổ sung ngân sách"));

        verify(requisitionEventPublisher).publishReviewed(new RequisitionReviewedEvent(
                7L, 9L, "Kỹ sư AI/Machine Learning", "CHANGES_REQUESTED", "Bổ sung ngân sách"));
    }

    @Test
    void rejectionIsSentToTheRequester() {
        service.reject(7L, recruiter, new JobRequisitionRejectRequest("Chưa có ngân sách quý này"));

        verify(requisitionEventPublisher).publishReviewed(new RequisitionReviewedEvent(
                7L, 9L, "Kỹ sư AI/Machine Learning", "REJECTED", "Chưa có ngân sách quý này"));
    }

    @Test
    void approvalIsSentToTheRequester() {
        service.approve(7L, recruiter, null);

        verify(requisitionEventPublisher).publishReviewed(new RequisitionReviewedEvent(
                7L, 9L, "Kỹ sư AI/Machine Learning", "APPROVED", null));
    }
}
