package iuh.fit.se.notification.event;

import iuh.fit.se.notification.client.ApplicationServiceClient;
import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.CandidateServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import iuh.fit.se.notification.notification.NotificationService;
import iuh.fit.se.notification.notification.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Ai nhận thông báo khi đơn ứng tuyển đổi trạng thái (phía công ty). */
class BusinessEventListenerTest {

    private NotificationService notifications;
    private AuthServiceClient auth;
    private BusinessEventListener listener;

    @BeforeEach
    void setUp() {
        notifications = mock(NotificationService.class);
        auth = mock(AuthServiceClient.class);
        listener = new BusinessEventListener(notifications, mock(DelayedMessagePublisher.class),
                mock(InterviewServiceClient.class), mock(ApplicationServiceClient.class),
                mock(CandidateServiceClient.class), auth);
        when(auth.getUsers("RECRUITER")).thenReturn(List.of(
                new UserSummaryResponse(2L, "Trần Thị Thu Hà", "tran.ha@example.com", "RECRUITER"),
                new UserSummaryResponse(3L, "Phạm Ngọc Ánh", "pham.anh@example.com", "RECRUITER")));
    }

    private static ApplicationStatusChangedEvent event(Long assignedRecruiterId, String toStageType, String closedReason) {
        return new ApplicationStatusChangedEvent(42L, 1L, 34L, 39L, assignedRecruiterId,
                "Ứng tuyển", "Đã rút đơn", toStageType, closedReason, "Lập trình viên Backend Java");
    }

    @Test
    void withdrawnWithoutAssigneeNotifiesEveryRecruiter() {
        listener.onApplicationStatusChanged(event(null, "REJECTED", "WITHDRAWN"));

        for (long recruiter : new long[] {2L, 3L}) {
            verify(notifications).createAndPush(eq(recruiter), eq(NotificationType.APPLICATION_STAGE_CHANGED),
                    eq("Ứng viên rút đơn"), contains("đã rút đơn ứng tuyển vị trí Lập trình viên Backend Java"),
                    eq("APPLICATION"), eq(42L));
        }
        // Ứng viên vẫn nhận câu xác nhận của mình.
        verify(notifications).createAndPush(eq(39L), any(), eq("Bạn đã rút đơn ứng tuyển"), anyString(),
                eq("APPLICATION"), eq(42L));
    }

    @Test
    void withdrawnWithAssigneeNotifiesOnlyAssignee() {
        listener.onApplicationStatusChanged(event(2L, "REJECTED", "WITHDRAWN"));

        verify(notifications).createAndPush(eq(2L), any(), eq("Ứng viên rút đơn"), anyString(), any(), anyLong());
        verify(notifications, never()).createAndPush(eq(3L), any(), anyString(), anyString(), any(), anyLong());
        verify(auth, never()).getUsers(anyString());
    }

    @Test
    void ordinaryStageChangeWithoutAssigneeDoesNotNotifyRecruiters() {
        listener.onApplicationStatusChanged(event(null, "SCREENING", null));

        verify(auth, never()).getUsers(anyString());
        verify(notifications, never()).createAndPush(eq(2L), any(), anyString(), anyString(), any(), anyLong());
    }
}
