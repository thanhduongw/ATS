package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.CandidateServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.RecruitmentServiceClient;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import iuh.fit.se.offer.client.dto.CandidateSummaryResponse;

@ExtendWith(MockitoExtension.class)
class OfferDepartmentAuthorizationTest {

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
    void hiringManagerCannotViewOfferFromAnotherDepartment() {
        Offer offer = offer(20L, 90L, 91L);
        CurrentUser actor = new CurrentUser(50L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertThrows(AccessDeniedException.class, () -> offerService.assertCanView(offer, actor));
    }

    @Test
    void hiringManagerCannotViewOfferFromAnotherDepartmentEvenWhenNamedApprover() {
        // Manager khong con la nguoi duyet offer, nen approverId khong con mo rong pham vi xem.
        Offer offer = offer(20L, 90L, 50L);
        CurrentUser actor = new CurrentUser(50L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertThrows(AccessDeniedException.class, () -> offerService.assertCanView(offer, actor));
    }

    @Test
    void hiringManagerCanViewOwnDepartmentOffer() {
        CurrentUser actor = new CurrentUser(50L, "hm@example.com", "HIRING_MANAGER", 10L);

        assertDoesNotThrow(() -> offerService.assertCanView(offer(10L, 90L, 91L), actor));
    }

    @Test
    void recruiterCanViewOfferFromEveryDepartment() {
        CurrentUser actor = new CurrentUser(60L, "recruiter@example.com", "RECRUITER", 10L);

        // HR phu trach tuyen dung toan cong ty: xem duoc offer cua phong ban khac
        // ke ca khi offer khong duoc gan cho minh.
        assertDoesNotThrow(() -> offerService.assertCanView(offer(20L, 90L, 91L), actor));
        assertDoesNotThrow(() -> offerService.assertCanView(offer(20L, 60L, 91L), actor));
    }

    @Test
    void candidateCannotViewAnotherCandidatesOffer() {
        Offer offer = offer(10L, 60L, 50L);
        offer.setCandidateId(200L);
        offer.setStatus(OfferStatus.APPROVED);
        when(candidateServiceClient.getByUserId(100L))
                .thenReturn(new CandidateSummaryResponse(
                        100L, "A", "a@example.com", null, null, 100L));
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);

        assertThrows(AccessDeniedException.class, () -> offerService.assertCanView(offer, actor));
    }

    @Test
    void candidateCannotViewOwnDraftOfferBeforePublication() {
        Offer offer = offer(10L, 60L, 50L);
        offer.setCandidateId(100L);
        offer.setStatus(OfferStatus.DRAFT);
        when(candidateServiceClient.getByUserId(100L))
                .thenReturn(new CandidateSummaryResponse(
                        100L, "A", "a@example.com", null, null, 100L));
        CurrentUser actor = new CurrentUser(100L, "a@example.com", "CANDIDATE", null);

        assertThrows(AccessDeniedException.class, () -> offerService.assertCanView(offer, actor));
    }

    private Offer offer(Long departmentId, Long assignedRecruiterId, Long approverId) {
        return Offer.builder()
                .departmentId(departmentId)
                .assignedRecruiterId(assignedRecruiterId)
                .approverId(approverId)
                .build();
    }
}
