package iuh.fit.se.notification.event;

import iuh.fit.se.notification.client.ApplicationServiceClient;
import iuh.fit.se.notification.client.AuthServiceClient;
import iuh.fit.se.notification.client.CandidateServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.notification.client.dto.CandidateSummaryResponse;
import iuh.fit.se.notification.client.dto.UserSummaryResponse;
import iuh.fit.se.notification.notification.NotificationService;
import iuh.fit.se.notification.notification.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
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
    private ApplicationServiceClient applications;
    private CandidateServiceClient candidates;
    private BusinessEventListener listener;

    @BeforeEach
    void setUp() {
        notifications = mock(NotificationService.class);
        auth = mock(AuthServiceClient.class);
        applications = mock(ApplicationServiceClient.class);
        candidates = mock(CandidateServiceClient.class);
        listener = new BusinessEventListener(notifications, mock(DelayedMessagePublisher.class),
                mock(InterviewServiceClient.class), applications, candidates, auth);
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

    private static InterviewCancelledEvent cancelled(boolean candidateNotified) {
        return new InterviewCancelledEvent(12L, 23L, LocalDateTime.of(2026, 11, 23, 15, 0), "Trương Thị Mỹ Linh",
                List.of(6L, 2L), 2L, candidateNotified);
    }

    @Test
    void cancelledBeforeAnnouncedTellsOtherInterviewersOnly() {
        listener.onInterviewCancelled(cancelled(false));

        verify(notifications).createAndPush(eq(6L), eq(NotificationType.INTERVIEW_CANCELLED), eq("Buổi phỏng vấn đã huỷ"),
                contains("Trương Thị Mỹ Linh"), eq("INTERVIEW"), eq(12L));
        // Người huỷ (2) không tự nhận; ứng viên chưa từng được báo lịch nên không tra hồ sơ, không báo.
        verify(notifications, never()).createAndPush(eq(2L), any(), anyString(), anyString(), any(), anyLong());
        verify(applications, never()).getApplicationById(anyLong());
    }

    @Test
    void cancelledAfterAnnouncedAlsoTellsCandidate() {
        when(applications.getApplicationById(23L)).thenReturn(new ApplicationSummaryResponse(23L, 21L, null, "Trương Thị Mỹ Linh"));
        when(candidates.getCandidateSummary(21L))
                .thenReturn(new CandidateSummaryResponse(21L, "Trương Thị Mỹ Linh", "truong.linh@example.com", null, null, 30L));

        listener.onInterviewCancelled(cancelled(true));

        verify(notifications).createAndPush(eq(30L), eq(NotificationType.INTERVIEW_CANCELLED), eq("Lịch phỏng vấn đã huỷ"),
                contains("đã huỷ"), eq("INTERVIEW"), eq(12L));
    }

    @Test
    void offerNotificationsNameThePosition() {
        listener.onOfferDeclined(new OfferDeclinedEvent(8L, 9L, 2L, "Nguyễn Thị Thanh Hằng", "Lương thấp", 3L, 17L,
                "Lập trình viên Mobile React Native"));

        verify(notifications).createAndPush(eq(2L), eq(NotificationType.OFFER_DECLINED), eq("Ứng viên từ chối thư mời"),
                eq("Nguyễn Thị Thanh Hằng đã từ chối thư mời nhận việc vị trí Lập trình viên Mobile React Native."
                        + " Lý do: Lương thấp"), eq("OFFER"), eq(8L));
    }

    @Test
    void requisitionChangeRequestTellsTheRequester() {
        listener.onRequisitionReviewed(new RequisitionReviewedEvent(7L, 9L, "Kỹ sư AI/Machine Learning",
                "CHANGES_REQUESTED", "Bổ sung ngân sách"));

        verify(notifications).createAndPush(eq(9L), eq(NotificationType.REQUISITION_REVIEWED),
                eq("Yêu cầu tuyển dụng cần sửa"),
                eq("Yêu cầu \"Kỹ sư AI/Machine Learning\" cần bổ sung trước khi duyệt. Nội dung: Bổ sung ngân sách"),
                eq("REQUISITION"), eq(7L));
    }
}
