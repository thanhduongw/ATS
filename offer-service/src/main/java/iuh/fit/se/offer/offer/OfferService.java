package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.dto.ApplicationAdvanceStageRequest;
import iuh.fit.se.offer.client.dto.ApplicationRejectRequest;
import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.offer.client.dto.CatalogItemResponse;
import iuh.fit.se.offer.client.dto.UserSummaryResponse;
import iuh.fit.se.offer.common.AccessGuard;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.exception.BusinessException;
import iuh.fit.se.offer.offer.dto.*;
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
    private final ApplicationServiceClient applicationServiceClient;
    private final AuthServiceClient authServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final OfferEventPublisher offerEventPublisher;
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
        ApplicationSummaryResponse application = fetchApplicationSummary(tenantId, req.applicationId());

        if (!STAGE_TYPE_OFFER.equals(application.currentStageType())) {
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
                .applicationId(application.id())
                .candidateNameSnapshot(application.candidateName())
                .salaryOffered(req.salaryOffered())
                .contractTypeId(req.contractTypeId())
                .startDate(req.startDate())
                .probationMonths(req.probationMonths())
                .responseDeadline(req.responseDeadline())
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
        offer.setResponseDeadline(req.responseDeadline());
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

        offerEventPublisher.publishOfferApproved(tenantId, offer.getId(), offer.getApplicationId(), offer.getRequesterId());
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
    public OfferResponse accept(Long tenantId, Long id, Long actorUserId, String userRole) {
        Offer offer = findOwned(tenantId, id);
        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận chấp nhận cho Offer đã được duyệt");
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offerRepository.save(offer);

        applicationServiceClient.advanceStage(
                tenantId, actorUserId, "SYSTEM", offer.getApplicationId(),
                new ApplicationAdvanceStageRequest("Ứng viên đã chấp nhận Offer"));

        auditEventPublisher.publish(tenantId, actorUserId, "OFFER_ACCEPTED", "OFFER", offer.getId(), null);

        return getById(tenantId, id);
    }

    @Transactional
    public OfferResponse decline(Long tenantId, Long id, Long actorUserId, String userRole, OfferDeclineRequest req) {
        Offer offer = findOwned(tenantId, id);
        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận từ chối cho Offer đã được duyệt");
        }

        offer.setStatus(OfferStatus.DECLINED);
        offer.setDeclineReasonId(req.declineReasonId());
        offer.setDeclineNote(req.note());
        offerRepository.save(offer);

        applicationServiceClient.reject(
                tenantId, actorUserId, "SYSTEM", offer.getApplicationId(),
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

    private ApplicationSummaryResponse fetchApplicationSummary(Long tenantId, Long applicationId) {
        try {
            return applicationServiceClient.getApplicationSummary(tenantId, applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
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
        List<UserSummaryResponse> users = authServiceClient.getUsers(tenantId, null);
        if (users == null) return Map.of();
        return users.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));
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
                o.getId(), o.getApplicationId(), o.getCandidateNameSnapshot() != null ? o.getCandidateNameSnapshot() : "N/A",
                o.getSalaryOffered(), o.getContractTypeId(), contractTypeMap.getOrDefault(o.getContractTypeId(), "N/A"),
                o.getStartDate(), o.getProbationMonths(), o.getResponseDeadline(), o.getBenefits(), o.getAllowance(), o.getNote(),
                o.getRequesterId(), userNameMap.getOrDefault(o.getRequesterId(), "N/A"),
                o.getApproverId(), userNameMap.getOrDefault(o.getApproverId(), "N/A"),
                o.getStatus(), o.getRejectReason(),
                o.getDeclineReasonId() == null ? null : reasonMap.get(o.getDeclineReasonId()),
                o.getDeclineNote(), o.getCreatedAt()
        );
    }
}
