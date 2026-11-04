package iuh.fit.se.application.application;

import iuh.fit.se.application.client.AuthServiceClient;
import iuh.fit.se.application.client.CandidateServiceClient;
import iuh.fit.se.application.client.MasterDataServiceClient;
import iuh.fit.se.application.client.RecruitmentServiceClient;
import iuh.fit.se.application.client.dto.CandidateSummaryResponse;
import iuh.fit.se.application.client.dto.CatalogItemResponse;
import iuh.fit.se.application.client.dto.PipelineResponse;
import iuh.fit.se.application.client.dto.PipelineStageResponse;
import iuh.fit.se.application.exception.BusinessException;
import iuh.fit.se.application.event.ApplicationEventPublisher;
import iuh.fit.se.application.event.AuditEventPublisher;
import iuh.fit.se.application.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Ứng viên tự rút đơn (docs/UI UC06; quyết định B5). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ApplicationWithdrawTest {

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
    void ownerWithdrawsAndApplicationEndsAsRejectedWithWithdrawReason() {
        Application app = application("TECHNICAL_INTERVIEW", 3);
        stub(app, 100L);

        applicationService.withdrawMyApplication(candidate(), 7L);

        assertThat(app.getCurrentStageType()).isEqualTo("REJECTED");
        assertThat(app.getRejectionReasonId()).isEqualTo(55L);
        verify(eventPublisher).publishApplicationStatusChanged(
                eq(7L), eq(30L), eq(100L), any(), any(), any(), eq("REJECTED"));
    }

    @Test
    void anotherCandidateCannotWithdraw() {
        Application app = application("CV_SCREENING", 2);
        stub(app, 999L); // tài khoản đang đăng nhập là ứng viên khác

        assertThrows(AccessDeniedException.class, () -> applicationService.withdrawMyApplication(candidate(), 7L));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void hiredApplicationCannotBeWithdrawn() {
        Application app = application("HIRED", 5);
        stub(app, 100L);

        assertThrows(BusinessException.class, () -> applicationService.withdrawMyApplication(candidate(), 7L));
        verify(applicationRepository, never()).save(any());
    }

    private void stub(Application app, Long candidateIdOfLoggedInUser) {
        when(applicationRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(app));
        when(candidateServiceClient.getByUserId(10L)).thenReturn(
                new CandidateSummaryResponse(candidateIdOfLoggedInUser, "A", "a@example.com", null, null));
        when(masterDataServiceClient.getRejectionReasons()).thenReturn(List.of(
                new CatalogItemResponse(54L, null, "Không đủ kinh nghiệm"),
                new CatalogItemResponse(55L, null, "Ứng viên tự rút hồ sơ")));
        when(masterDataServiceClient.getPipelineById(9L)).thenReturn(new PipelineResponse(9L, "6", true, List.of(
                new PipelineStageResponse(1L, "Ứng tuyển", 1, "APPLIED"),
                new PipelineStageResponse(2L, "Sàng lọc", 2, "CV_SCREENING"),
                new PipelineStageResponse(3L, "Phỏng vấn", 3, "TECHNICAL_INTERVIEW"),
                new PipelineStageResponse(4L, "Thư mời", 4, "OFFER"),
                new PipelineStageResponse(5L, "Đã tuyển", 5, "HIRED"),
                new PipelineStageResponse(6L, "Từ chối", 6, "REJECTED"))));
        when(masterDataServiceClient.getRecruitmentSources()).thenReturn(List.of());
        when(recruitmentServiceClient.getPostingById(30L)).thenReturn(new iuh.fit.se.application.client.dto.JobPostingResponse(
                30L, 9L, "OPEN", "Lập trình viên Backend cấp cao", 20L, "Kỹ thuật"));
    }

    private CurrentUser candidate() {
        return new CurrentUser(10L, "a@example.com", "CANDIDATE", null);
    }

    private Application application(String stageType, int order) {
        return Application.builder()
                .id(7L)
                .candidateId(100L)
                .candidateNameSnapshot("A")
                .jobPostingId(30L)
                .departmentId(20L)
                .pipelineId(9L)
                .currentStageId((long) order)
                .currentStageOrder(order)
                .currentStageType(stageType)
                .currentStageName(stageType)
                .build();
    }
}
