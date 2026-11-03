package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.CandidateServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.RecruitmentServiceClient;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.offer.dto.OfferResponse;
import iuh.fit.se.offer.security.AuthorizationPolicy;
import iuh.fit.se.offer.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Thiết kế docs/UI (DS06 "Quyền hiển thị"): Đại diện phòng ban không thấy lương trong thư mời.
 */
@ExtendWith(MockitoExtension.class)
class OfferCompensationVisibilityTest {

    @Mock private OfferRepository offerRepository;
    @Mock private ApplicationServiceClient applicationServiceClient;
    @Mock private AuthServiceClient authServiceClient;
    @Mock private MasterDataServiceClient masterDataServiceClient;
    @Mock private CandidateServiceClient candidateServiceClient;
    @Mock private RecruitmentServiceClient recruitmentServiceClient;
    @Mock private OfferEventPublisher offerEventPublisher;
    @Mock private AuditEventPublisher auditEventPublisher;
    @Mock private OfferPdfService offerPdfService;

    @InjectMocks private OfferService offerService;

    @Test
    void hiringManagerDoesNotSeeCompensation() {
        OfferResponse r = OfferService.forViewer(sample(), AuthorizationPolicy.Role.HIRING_MANAGER);

        assertThat(r.salaryOffered()).isNull();
        assertThat(r.allowance()).isNull();
        assertThat(r.performanceBonus()).isNull();
        assertThat(r.note()).isNull();
        // Thông tin không phải tiền vẫn giữ để theo dõi kết quả tuyển dụng.
        assertThat(r.candidateName()).isEqualTo("Hồ Ngọc Mai");
        assertThat(r.jobTitle()).isEqualTo("Lập trình viên Backend cấp cao");
        assertThat(r.startDate()).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(r.status()).isEqualTo(OfferStatus.APPROVED);
    }

    @Test
    void recruiterAndAdminStillSeeCompensation() {
        OfferResponse original = sample();

        assertThat(OfferService.forViewer(original, AuthorizationPolicy.Role.RECRUITER)).isSameAs(original);
        assertThat(OfferService.forViewer(original, AuthorizationPolicy.Role.COMPANY_ADMIN)).isSameAs(original);
        assertThat(original.salaryOffered()).isEqualByComparingTo("35000000");
    }

    @Test
    void hiringManagerCannotDownloadOfferPdf() {
        Offer offer = Offer.builder().departmentId(10L).build();
        offer.setId(7L);
        when(offerRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(offer));
        CurrentUser hm = new CurrentUser(50L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertThrows(AccessDeniedException.class, () -> offerService.generateOfferPdf(hm, 7L));
        verifyNoInteractions(offerPdfService);
    }

    private OfferResponse sample() {
        return new OfferResponse(
                1L, 2L, "Hồ Ngọc Mai", "mai.ho@gmail.com", "0909771230",
                "Lập trình viên Backend cấp cao",
                new BigDecimal("35000000"),
                3L, "Không xác định thời hạn", LocalDate.of(2026, 12, 1), 2,
                "Trần Minh Đức", 4L, "VND", "Hằng tháng",
                "Tối đa 2 tháng lương/năm",
                15, LocalDateTime.of(2026, 11, 8, 17, 0), "Bảo hiểm sức khoẻ",
                new BigDecimal("1500000"),
                "Ứng viên đang có thư mời khác 34 triệu",
                "Mong sớm được làm việc cùng chị",
                5L, "Hoàng Thu Ngân", 6L, "Hoàng Thu Ngân",
                OfferStatus.APPROVED, null, null, null,
                LocalDateTime.of(2026, 10, 27, 9, 0), null, null,
                null, null, null, 0, null);
    }
}
