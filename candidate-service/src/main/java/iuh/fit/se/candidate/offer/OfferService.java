package iuh.fit.se.candidate.offer;

import iuh.fit.se.candidate.application.Application;
import iuh.fit.se.candidate.application.ApplicationRepository;
import iuh.fit.se.candidate.application.ApplicationService;
import iuh.fit.se.candidate.application.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.candidate.application.dto.ApplicationRejectRequest;
import iuh.fit.se.candidate.client.AuthServiceClient;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.client.dto.UserSummaryResponse;
import iuh.fit.se.candidate.common.AccessGuard;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.event.CandidateEventPublisher;
import iuh.fit.se.candidate.exception.BusinessException;
import iuh.fit.se.candidate.offer.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class OfferService {

    private static final String STAGE_TYPE_OFFER = "OFFER";
    private static final Set<OfferStatus> NON_TERMINAL = Set.of(
            OfferStatus.DRAFT, OfferStatus.PENDING_APPROVAL, OfferStatus.APPROVED);

    private final OfferRepository offerRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationService applicationService;
    private final AuthServiceClient authServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final CandidateEventPublisher candidateEventPublisher;
    private final AuditEventPublisher auditEventPublisher;

    public List<OfferResponse> getAll(Long tenantId, Long applicationId) {
        List<Offer> offers = applicationId != null
                ? offerRepository.findByTenantIdAndApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, applicationId)
                : offerRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId);

        Map<Long, String> userNameMap = buildUserNameMap(tenantId);
        Map<Long, String> contractTypeMap = buildCatalogMap(masterDataServiceClient.getContractTypes(tenantId));
        Map<Long, String> reasonMap = buildCatalogMap(masterDataServiceClient.getRejectionReasons(tenantId));

        return offers.stream().map(o -> toResponse(o, userNameMap, contractTypeMap, reasonMap)).toList();
    }

    public OfferResponse getById(Long tenantId, Long id) {
        Offer offer = findOwned(tenantId, id);
        return toResponse(offer, buildUserNameMap(tenantId),
                buildCatalogMap(masterDataServiceClient.getContractTypes(tenantId)),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons(tenantId)));
    }

    @Transactional
    public OfferResponse create(Long tenantId, Long requesterId, OfferCreateRequest req) {
        Application application = applicationRepository.findByIdAndTenantIdAndDeletedAtIsNull(req.applicationId(), tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng tuyển"));

        if (!STAGE_TYPE_OFFER.equals(application.getCurrentStageType())) {
            throw new BusinessException("Chỉ tạo Offer khi hồ sơ đã đến giai đoạn Offer trong quy trình tuyển dụng");
        }

        boolean hasActiveOffer = offerRepository.findByTenantIdAndApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId, req.applicationId())
                .stream().anyMatch(o -> NON_TERMINAL.contains(o.getStatus()) || o.getStatus() == OfferStatus.ACCEPTED);
        if (hasActiveOffer) {
            throw new BusinessException("Hồ sơ này đã có Offer đang xử lý hoặc đã được chấp nhận");
        }

        validateContractType(tenantId, req.contractTypeId());
        validateApprover(tenantId, req.approverId());


        Offer saved = offerRepository.save(Offer.builder()
                .tenantId(tenantId)
                .application(application)
                .salaryOffered(req.salaryOffered())
                .contractTypeId(req.contractTypeId())
                .startDate(req.startDate())
                .probationMonths(req.probationMonths())
                .benefits(req.benefits())
                .allowance(req.allowance())
                .note(req.note())
                .requesterId(requesterId)
                .approverId(req.approverId())
                .status(OfferStatus.DRAFT)
                .build());

        return getById(tenantId, saved.getId());
    }

    @Transactional
    public OfferResponse update(Long tenantId, Long id, Long requesterId, OfferUpdateRequest req) {
        Offer offer = findOwned(tenantId, id);
        AccessGuard.requireOwner(offer.getRequesterId(), requesterId);

        if (offer.getStatus() != OfferStatus.DRAFT) {
            throw new BusinessException("Chỉ chỉnh sửa được Offer ở trạng thái bản nháp");
        }

        validateContractType(tenantId, req.contractTypeId());
        validateApprover(tenantId, req.approverId());


        offer.setSalaryOffered(req.salaryOffered());
        offer.setContractTypeId(req.contractTypeId());
        offer.setStartDate(req.startDate());
        offer.setProbationMonths(req.probationMonths());
        offer.setBenefits(req.benefits());
        offer.setAllowance(req.allowance());
        offer.setNote(req.note());
        offer.setApproverId(req.approverId());

        offerRepository.save(offer);
        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse submit(Long tenantId, Long id, Long requesterId) {
        Offer offer = findOwned(tenantId, id);
        AccessGuard.requireOwner(offer.getRequesterId(), requesterId);

        if (offer.getStatus() != OfferStatus.DRAFT) {
            throw new BusinessException("Chỉ gửi duyệt được Offer đang ở trạng thái bản nháp");
        }
        offer.setStatus(OfferStatus.PENDING_APPROVAL);
        offerRepository.save(offer);
        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse approve(Long tenantId, Long id, Long approverUserId) {
        Offer offer = findOwned(tenantId, id);
        AccessGuard.requireApprover(offer.getApproverId(), approverUserId);

        if (offer.getStatus() != OfferStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ phê duyệt được Offer đang chờ duyệt");
        }
        offer.setStatus(OfferStatus.APPROVED);
        offerRepository.save(offer);

        candidateEventPublisher.publishOfferApproved(tenantId, offer.getId(), offer.getApplication().getId(), offer.getRequesterId());
        auditEventPublisher.publish(tenantId, approverUserId, "OFFER_APPROVED", "OFFER", offer.getId(), null);

        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse reject(Long tenantId, Long id, Long approverUserId, OfferRejectRequest req) {
        Offer offer = findOwned(tenantId, id);
        AccessGuard.requireApprover(offer.getApproverId(), approverUserId);

        if (offer.getStatus() != OfferStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ từ chối được Offer đang chờ duyệt");
        }
        offer.setStatus(OfferStatus.REJECTED);
        offer.setRejectReason(req.reason());
        offerRepository.save(offer);
        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse accept(Long tenantId, Long id, Long actorUserId) {
        Offer offer = findOwned(tenantId, id);
        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận chấp nhận cho Offer đã được duyệt");
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offerRepository.save(offer);

        applicationService.advanceStage(
                tenantId, offer.getApplication().getId(), actorUserId,
                new ApplicationAdvanceStageRequest("Ứng viên đã chấp nhận Offer"));

        auditEventPublisher.publish(tenantId, actorUserId, "OFFER_ACCEPTED", "OFFER", offer.getId(), null);

        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse decline(Long tenantId, Long id, Long actorUserId, OfferDeclineRequest req) {
        Offer offer = findOwned(tenantId, id);
        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận từ chối cho Offer đã được duyệt");
        }

        offer.setStatus(OfferStatus.DECLINED);
        offer.setDeclineReasonId(req.declineReasonId());
        offer.setDeclineNote(req.note());
        offerRepository.save(offer);

        applicationService.reject(
                tenantId, offer.getApplication().getId(), actorUserId,
                new ApplicationRejectRequest(req.declineReasonId(), "Ứng viên từ chối Offer: " +
                        (req.note() != null ? req.note() : "")));

        auditEventPublisher.publish(tenantId, actorUserId, "OFFER_DECLINED", "OFFER", offer.getId(), req.note());

        return getById(tenantId, id);
    }

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        Offer offer = findOwned(tenantId, id);
        if (offer.getStatus() == OfferStatus.ACCEPTED) {
            throw new BusinessException("Không thể xóa Offer đã được chấp nhận");
        }
        offer.setDeletedAt(LocalDateTime.now());
        offerRepository.save(offer);
        auditEventPublisher.publish(tenantId, actorUserId, "OFFER_DELETED", "OFFER", id, null);
    }

    private void validateContractType(Long tenantId, Long id) {
        boolean valid = masterDataServiceClient.getContractTypes(tenantId).stream().anyMatch(c -> c.id().equals(id));
        if (!valid) throw new BusinessException("Loại hợp đồng không hợp lệ");
    }

    private void validateApprover(Long tenantId, Long approverId) {
        List<UserSummaryResponse> eligible = Stream.concat(
                authServiceClient.getUsers(tenantId, "HIRING_MANAGER").stream(),
                authServiceClient.getUsers(tenantId, "COMPANY_ADMIN").stream()
        ).toList();
        boolean valid = eligible.stream().anyMatch(u -> u.id().equals(approverId));
        if (!valid) {
            throw new BusinessException("Người được chọn phải là Hiring Manager hoặc Company Admin");
        }
    }

    private Map<Long, String> buildUserNameMap(Long tenantId) {
        return authServiceClient.getUsers(tenantId, null).stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName));
    }


    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }

    private Offer findOwned(Long tenantId, Long id) {
        return offerRepository.findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy Offer"));
    }

    private OfferResponse toResponse(
            Offer o, Map<Long, String> userNameMap, Map<Long, String> contractTypeMap, Map<Long, String> reasonMap) {
        return new OfferResponse(
                o.getId(), o.getApplication().getId(), o.getApplication().getCandidate().getFullName(),
                o.getSalaryOffered(), o.getContractTypeId(), contractTypeMap.getOrDefault(o.getContractTypeId(), "N/A"),
                o.getStartDate(), o.getProbationMonths(), o.getBenefits(), o.getAllowance(), o.getNote(),
                o.getRequesterId(), userNameMap.getOrDefault(o.getRequesterId(), "N/A"),
                o.getApproverId(), userNameMap.getOrDefault(o.getApproverId(), "N/A"),
                o.getStatus(), o.getRejectReason(),
                o.getDeclineReasonId() == null ? null : reasonMap.get(o.getDeclineReasonId()),
                o.getDeclineNote(), o.getCreatedAt()
        );
    }
}