package iuh.fit.se.notification.auditlog;

import iuh.fit.se.notification.client.ApplicationServiceClient;
import iuh.fit.se.notification.client.InterviewServiceClient;
import iuh.fit.se.notification.client.OfferServiceClient;
import iuh.fit.se.notification.client.RecruitmentServiceClient;
import iuh.fit.se.notification.security.CurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** W-52: đại diện phòng ban không đọc được lịch sử hồ sơ / buổi phỏng vấn của phòng khác. */
class AuditResourceAccessTest {

    private ApplicationServiceClient applications;
    private InterviewServiceClient interviews;
    private OfferServiceClient offers;
    private RecruitmentServiceClient recruitment;
    private AuditResourceAccess access;

    private final CurrentUser backendManager = new CurrentUser(4L, "nguyen.long@example.com", "HIRING_MANAGER", 1L);
    private final CurrentUser recruiter = new CurrentUser(2L, "tran.ha@example.com", "RECRUITER", null);

    @BeforeEach
    void setUp() {
        applications = mock(ApplicationServiceClient.class);
        interviews = mock(InterviewServiceClient.class);
        offers = mock(OfferServiceClient.class);
        recruitment = mock(RecruitmentServiceClient.class);
        access = new AuditResourceAccess(applications, interviews, offers, recruitment);
    }

    @Test
    void recruiterSeesEveryRequestedResourceWithoutExtraCalls() {
        assertThat(access.visibleIds(recruiter, "APPLICATION", List.of(18L, 20L))).containsExactly(18L, 20L);
        verifyNoInteractions(applications, interviews, offers, recruitment);
    }

    @Test
    void managerOnlySeesResourcesTheOwningServiceLetsThemOpen() {
        // Hồ sơ 18 thuộc phòng Backend; hồ sơ 20 thuộc phòng Frontend → application-service trả 403.
        when(applications.getApplicationById(20L)).thenThrow(new RuntimeException("403 Forbidden"));

        assertThat(access.visibleIds(backendManager, "APPLICATION", List.of(18L, 20L))).containsExactly(18L);
    }

    @Test
    void managerCannotReadHistoryOfOtherKinds() {
        assertThat(access.visibleIds(backendManager, "USER", List.of(3L))).isEmpty();
        assertThat(access.visibleIds(backendManager, "CATALOG", List.of(1L))).isEmpty();
    }

    @Test
    void managerChecksOffersAndRequisitionsThroughTheirOwnServices() {
        when(offers.getOffer(7L)).thenThrow(new RuntimeException("403 Forbidden"));
        when(recruitment.getRequisition(9L)).thenThrow(new RuntimeException("403 Forbidden"));

        assertThat(access.visibleIds(backendManager, "OFFER", List.of(6L, 7L))).containsExactly(6L);
        assertThat(access.visibleIds(backendManager, "REQUISITION", List.of(8L, 9L))).containsExactly(8L);
    }
}
