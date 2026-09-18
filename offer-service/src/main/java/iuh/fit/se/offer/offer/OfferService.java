package iuh.fit.se.offer.offer;

import iuh.fit.se.offer.client.ApplicationServiceClient;
import iuh.fit.se.offer.client.AuthServiceClient;
import iuh.fit.se.offer.client.CandidateServiceClient;
import iuh.fit.se.offer.client.MasterDataServiceClient;
import iuh.fit.se.offer.client.RecruitmentServiceClient;
import iuh.fit.se.offer.client.dto.ApplicationSummaryResponse;
import iuh.fit.se.offer.client.dto.CatalogItemResponse;
import iuh.fit.se.offer.client.dto.JobPostingSummaryResponse;
import iuh.fit.se.offer.client.dto.UserSummaryResponse;
import iuh.fit.se.offer.common.PageResponse;
import iuh.fit.se.offer.event.AuditEventPublisher;
import iuh.fit.se.offer.event.OfferEventPublisher;
import iuh.fit.se.offer.exception.BusinessException;
import iuh.fit.se.offer.offer.dto.*;
import iuh.fit.se.offer.security.AuthorizationPolicy;
import iuh.fit.se.offer.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class OfferService {

    private static final String STAGE_TYPE_OFFER = "OFFER";
    private static final Set<OfferStatus> NON_TERMINAL = Set.of(
            OfferStatus.DRAFT, OfferStatus.PENDING_APPROVAL, OfferStatus.APPROVED);
    private static final Set<OfferStatus> CANDIDATE_VISIBLE_STATUSES = Set.of(
            OfferStatus.APPROVED, OfferStatus.ACCEPTED, OfferStatus.DECLINED);
    /**
     * Offer con chiem mot suat tuyen dung. REJECTED va DECLINED tra suat lai cho tin tuyen dung,
     * nho vay HR offer duoc cho ung vien xep sau khi nguoi duoc chon tu choi.
     */
    private static final Set<OfferStatus> HEADCOUNT_CONSUMING = Set.of(
            OfferStatus.DRAFT, OfferStatus.PENDING_APPROVAL,
            OfferStatus.APPROVED, OfferStatus.ACCEPTED);

    private final OfferRepository offerRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final AuthServiceClient authServiceClient;
    private final MasterDataServiceClient masterDataServiceClient;
    private final CandidateServiceClient candidateServiceClient;
    private final RecruitmentServiceClient recruitmentServiceClient;
    private final OfferEventPublisher offerEventPublisher;
    private final AuditEventPublisher auditEventPublisher;
    private final OfferPdfService offerPdfService;

    public PageResponse<OfferResponse> getAll(
            CurrentUser actor, Long applicationId, Long jobPostingId,
            OfferStatus status, LocalDate createdFrom, LocalDate createdTo,
            Integer page, Integer size) {

        Long candidateId = null;
        Long scopeDepartmentId = null;
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            candidateId = resolveCandidateId(actor.userId());
        } else if (role == AuthorizationPolicy.Role.HIRING_MANAGER) {
            // Manager khong con duyet offer, chi theo doi ket qua offer cua phong ban minh.
            scopeDepartmentId = actor.departmentId();
        } else {
            // COMPANY_ADMIN va HR (RECRUITER) deu xem duoc toan bo offer cua cong ty.
            AuthorizationPolicy.requireHr(actor);
        }

        var spec = OfferSpecifications.build(
                candidateId, null, applicationId, jobPostingId, status,
                createdFrom != null ? createdFrom.atStartOfDay() : null,
                createdTo != null ? createdTo.atTime(LocalTime.MAX) : null,
                scopeDepartmentId, null, null,
                role == AuthorizationPolicy.Role.CANDIDATE);

        Map<Long, String> userNameMap = role == AuthorizationPolicy.Role.CANDIDATE
                ? Map.of()
                : buildUserNameMap();
        Map<Long, String> contractTypeMap = buildCatalogMap(masterDataServiceClient.getContractTypes());
        Map<Long, String> reasonMap = buildCatalogMap(masterDataServiceClient.getRejectionReasons());

        if (page == null && size == null) {
            List<Offer> all = offerRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
            return PageResponse.unpaged(all.stream()
                    .map(o -> toResponse(o, userNameMap, contractTypeMap, reasonMap))
                    .toList());
        }

        var pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = offerRepository.findAll(spec, pageable)
                .map(offer -> toResponse(offer, userNameMap, contractTypeMap, reasonMap));
        return PageResponse.of(result);
    }

    public OfferResponse getById(CurrentUser actor, Long id) {
        Offer offer = findById(id);
        assertCanView(offer, actor);
        Map<Long, String> userNameMap =
                AuthorizationPolicy.roleOf(actor) == AuthorizationPolicy.Role.CANDIDATE
                        ? Map.of() : buildUserNameMap();
        return toResponse(offer, userNameMap,
                buildCatalogMap(masterDataServiceClient.getContractTypes()),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons()));
    }

    public List<CandidateOfferResponse> getMyOffers(CurrentUser actor) {
        AuthorizationPolicy.requireCandidate(actor);
        long candidateId = resolveCandidateId(actor.userId());
        var spec = OfferSpecifications.build(
                candidateId, null, null, null, null,
                null, null, null, null, null, true);
        Map<Long, String> contractTypeMap = buildCatalogMap(
                masterDataServiceClient.getContractTypes());
        Map<Long, String> reasonMap = buildCatalogMap(
                masterDataServiceClient.getRejectionReasons());
        return offerRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(offer -> toCandidateResponse(offer, contractTypeMap, reasonMap))
                .toList();
    }

    public CandidateOfferResponse getMyOffer(CurrentUser actor, Long id) {
        AuthorizationPolicy.requireCandidate(actor);
        Offer offer = findById(id);
        assertCandidateOwns(actor.userId(), offer);
        requireCandidateVisible(offer);
        return toCandidateResponse(
                offer,
                buildCatalogMap(masterDataServiceClient.getContractTypes()),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons()));
    }

    public byte[] generateOfferPdf(CurrentUser actor, Long id) {
        Offer offer = findById(id);
        assertCanView(offer, actor);

        String companyName = authServiceClient.getCompany().name();
        Map<Long, String> contractTypeMap = buildCatalogMap(masterDataServiceClient.getContractTypes());
        String contractTypeName = contractTypeMap.getOrDefault(offer.getContractTypeId(), "N/A");

        return offerPdfService.generate(offer, companyName, contractTypeName);
    }

    /** Internal / Feign không cần role */
    public OfferResponse getById(Long id) {
        Offer offer = findById(id);
        return toResponse(offer, buildUserNameMap(),
                buildCatalogMap(masterDataServiceClient.getContractTypes()),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons()));
    }

    @Transactional
    public OfferResponse create(CurrentUser actor, OfferCreateRequest req) {
        AuthorizationPolicy.requireHr(actor);
        ApplicationSummaryResponse application = fetchApplicationSummary(req.applicationId());

        if (!STAGE_TYPE_OFFER.equals(application.currentStageType())) {
            throw new BusinessException(
                    "Chỉ tạo Offer khi hồ sơ đã đến giai đoạn Offer trong quy trình tuyển dụng");
        }

        boolean hasActiveOffer = offerRepository
                .findByApplicationIdAndDeletedAtIsNullOrderByCreatedAtDesc(req.applicationId())
                .stream()
                .anyMatch(o -> NON_TERMINAL.contains(o.getStatus()) || o.getStatus() == OfferStatus.ACCEPTED);
        if (hasActiveOffer) {
            throw new BusinessException("Hồ sơ này đã có Offer đang xử lý hoặc đã được chấp nhận");
        }

        validateContractType(req.contractTypeId());
        validateApprover(req.approverId());
        JobPostingSummaryResponse posting = requireHeadcountAvailable(application.jobPostingId());

        Offer saved = offerRepository.save(Offer.builder()
                .applicationId(application.id())
                .jobPostingId(application.jobPostingId())
                .departmentId(application.departmentId())
                .assignedRecruiterId(application.assignedRecruiterId())
                .candidateId(application.candidateId())
                .candidateNameSnapshot(application.candidateName())
                .candidateEmailSnapshot(application.candidateEmail())
                .candidatePhoneSnapshot(resolveCandidatePhone(application.candidateId()))
                .jobTitleSnapshot(posting == null ? null : posting.title())
                .salaryOffered(req.salaryOffered())
                .contractTypeId(req.contractTypeId())
                .startDate(req.startDate())
                .probationMonths(req.probationMonths())
                .reportingManager(req.reportingManager())
                .workLocationId(req.workLocationId() != null
                        ? req.workLocationId()
                        : (posting == null ? null : posting.workLocationId()))
                .currency(req.currency() != null ? req.currency() : "VND")
                .payFrequency(req.payFrequency() != null ? req.payFrequency() : "MONTHLY")
                .performanceBonus(req.performanceBonus())
                .annualLeaveDays(req.annualLeaveDays())
                .responseDeadline(req.responseDeadline())
                .benefits(req.benefits())
                .allowance(req.allowance())
                .note(req.note())
                .candidateVisibleNote(req.candidateVisibleNote())
                .requesterId(actor.userId())
                .approverId(req.approverId())
                .status(OfferStatus.DRAFT)
                .build());

        auditEventPublisher.publish(actor.userId(), "OFFER_CREATED", "OFFER", saved.getId(), null);
        return getById(saved.getId());
    }

    @Transactional
    public OfferResponse update(Long id, CurrentUser actor, OfferUpdateRequest req) {
        Offer offer = findById(id);
        fetchApplicationSummary(offer.getApplicationId());
        AuthorizationPolicy.requireOwnerOrAdmin(actor, offer.getRequesterId());

        if (offer.getStatus() != OfferStatus.DRAFT) {
            throw new BusinessException("Chỉ chỉnh sửa được Offer ở trạng thái bản nháp");
        }

        validateContractType(req.contractTypeId());
        validateApprover(req.approverId());

        offer.setSalaryOffered(req.salaryOffered());
        offer.setContractTypeId(req.contractTypeId());
        offer.setStartDate(req.startDate());
        offer.setProbationMonths(req.probationMonths());
        offer.setReportingManager(req.reportingManager());
        offer.setWorkLocationId(req.workLocationId());
        offer.setCurrency(req.currency() != null ? req.currency() : "VND");
        offer.setPayFrequency(req.payFrequency() != null ? req.payFrequency() : "MONTHLY");
        offer.setPerformanceBonus(req.performanceBonus());
        offer.setAnnualLeaveDays(req.annualLeaveDays());
        offer.setResponseDeadline(req.responseDeadline());
        offer.setBenefits(req.benefits());
        offer.setAllowance(req.allowance());
        offer.setNote(req.note());
        offer.setCandidateVisibleNote(req.candidateVisibleNote());
        offer.setApproverId(req.approverId());

        offerRepository.save(offer);
        return getById(id);
    }

    @Transactional
    public OfferResponse submit(Long id, CurrentUser actor) {
        Offer offer = findById(id);
        fetchApplicationSummary(offer.getApplicationId());
        AuthorizationPolicy.requireOwnerOrAdmin(actor, offer.getRequesterId());

        if (offer.getStatus() != OfferStatus.DRAFT) {
            throw new BusinessException("Chỉ gửi duyệt được Offer đang ở trạng thái bản nháp");
        }
        offer.setStatus(OfferStatus.PENDING_APPROVAL);
        offer.setSubmittedAt(LocalDateTime.now());
        offerRepository.save(offer);
        return getById(id);
    }

    @Transactional
    public OfferResponse approve(Long id, CurrentUser actor) {
        Offer offer = findById(id);
        AuthorizationPolicy.requireAssignedOrAdmin(actor, offer.getApproverId());

        if (offer.getStatus() != OfferStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ phê duyệt được Offer đang chờ duyệt");
        }
        offer.setStatus(OfferStatus.APPROVED);
        offer.setApprovedAt(LocalDateTime.now());
        offerRepository.save(offer);

        Long candidateUserId = resolveCandidateUserId(offer.getCandidateId());
        offerEventPublisher.publishOfferApproved(
                offer.getId(),
                offer.getApplicationId(),
                offer.getRequesterId(),
                offer.getCandidateId());
        auditEventPublisher.publish(actor.userId(), "OFFER_APPROVED", "OFFER", offer.getId(), null);

        return getById(id);
    }

    @Transactional
    public OfferResponse reject(Long id, CurrentUser actor, OfferRejectRequest req) {
        Offer offer = findById(id);
        AuthorizationPolicy.requireAssignedOrAdmin(actor, offer.getApproverId());

        if (offer.getStatus() != OfferStatus.PENDING_APPROVAL) {
            throw new BusinessException("Chỉ từ chối được Offer đang chờ duyệt");
        }
        offer.setStatus(OfferStatus.REJECTED);
        offer.setRejectReason(req.reason());
        offerRepository.save(offer);

        auditEventPublisher.publish(
                actor.userId(), "OFFER_REJECTED", "OFFER", offer.getId(), req.reason());
        return getById(id);
    }

    @Transactional
    public CandidateOfferResponse accept(Long id, CurrentUser actor) {
        Offer offer = findById(id);
        fetchApplicationSummary(offer.getApplicationId());
        assertCandidateOwns(actor.userId(), offer);

        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận chấp nhận cho Offer đã được duyệt");
        }
        if (offer.getResponseDeadline() != null
                && offer.getResponseDeadline().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Offer đã hết hạn phản hồi");
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offerRepository.save(offer);

        // The application stage transition is owned by application-service and is driven by this
        // event. A synchronous call is not possible here: the actor is a CANDIDATE, and the old
        // "SYSTEM" role header is rejected by the downstream trusted-header filter.
        offerEventPublisher.publishOfferAccepted(
                offer.getId(), offer.getApplicationId(),
                offer.getRequesterId(), offer.getCandidateNameSnapshot(),
                actor.userId());
        auditEventPublisher.publish(actor.userId(), "OFFER_ACCEPTED", "OFFER", offer.getId(), null);
        // Candidate-facing DTO: the internal OfferResponse needs an internal-staff name map the
        // candidate is not allowed to read, and it would expose requester/approver identities.
        return toCandidateResponse(
                offer,
                buildCatalogMap(masterDataServiceClient.getContractTypes()),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons()));
    }

    @Transactional
    public CandidateOfferResponse decline(
            Long id, CurrentUser actor, OfferDeclineRequest req) {
        Offer offer = findById(id);
        fetchApplicationSummary(offer.getApplicationId());
        assertCandidateOwns(actor.userId(), offer);

        if (offer.getStatus() != OfferStatus.APPROVED) {
            throw new BusinessException("Chỉ ghi nhận từ chối cho Offer đã được duyệt");
        }

        offer.setStatus(OfferStatus.DECLINED);
        offer.setDeclineReasonId(req.declineReasonId());
        offer.setDeclineNote(req.note());
        offerRepository.save(offer);

        // See accept(): application-service reacts to this event instead of being called with a
        // forged "SYSTEM" identity.
        offerEventPublisher.publishOfferDeclined(
                offer.getId(), offer.getApplicationId(),
                offer.getRequesterId(), offer.getCandidateNameSnapshot(), req.note(),
                req.declineReasonId(), actor.userId());
        auditEventPublisher.publish(
                actor.userId(), "OFFER_DECLINED", "OFFER", offer.getId(), req.note());
        // See accept(): candidate responses use the candidate-facing DTO.
        return toCandidateResponse(
                offer,
                buildCatalogMap(masterDataServiceClient.getContractTypes()),
                buildCatalogMap(masterDataServiceClient.getRejectionReasons()));
    }

    @Transactional
    public void softDelete(Long id, CurrentUser actor) {
        Offer offer = findById(id);
        fetchApplicationSummary(offer.getApplicationId());
        AuthorizationPolicy.requireOwnerOrAdmin(actor, offer.getRequesterId());
        if (offer.getStatus() == OfferStatus.ACCEPTED) {
            throw new BusinessException("Không thể xóa Offer đã được chấp nhận");
        }
        offer.setDeletedAt(LocalDateTime.now());
        offerRepository.save(offer);
        auditEventPublisher.publish(actor.userId(), "OFFER_DELETED", "OFFER", id, null);
    }

    void assertCanView(Offer offer, CurrentUser actor) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        // COMPANY_ADMIN va HR (RECRUITER) deu phu trach toan cong ty, khong gioi han phong ban.
        if (role == AuthorizationPolicy.Role.COMPANY_ADMIN
                || role == AuthorizationPolicy.Role.RECRUITER) {
            return;
        }
        boolean sameDepartment = actor.departmentId() != null
                && actor.departmentId().equals(offer.getDepartmentId());
        if (role == AuthorizationPolicy.Role.HIRING_MANAGER) {
            // Manager chi theo doi ket qua offer cua phong ban, khong con quyen duyet.
            if (!sameDepartment) {
                throw new AccessDeniedException("Offer thuộc phòng ban khác");
            }
            return;
        }
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            assertCandidateOwns(actor.userId(), offer);
            requireCandidateVisible(offer);
            return;
        }
        throw new AccessDeniedException("Bạn không có quyền xem Offer này");
    }

    private void assertCandidateOwns(Long userId, Offer offer) {
        long candidateId = resolveCandidateId(userId);
        if (!Objects.equals(offer.getCandidateId(), candidateId)) {
            throw new AccessDeniedException("Đây không phải Offer của bạn");
        }
    }

    private void requireCandidateVisible(Offer offer) {
        if (!CANDIDATE_VISIBLE_STATUSES.contains(offer.getStatus())) {
            throw new AccessDeniedException("Offer chua duoc cong bo cho ung vien");
        }
    }

    private long resolveCandidateId(Long userId) {
        try {
            return candidateServiceClient.getByUserId(userId).id();
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng viên gắn với tài khoản");
        }
    }

    private Long resolveCandidateUserId(Long candidateId) {
        try {
            return candidateServiceClient.getCandidateSummary(candidateId).userId();
        } catch (Exception e) {
            return null;
        }
    }

    private ApplicationSummaryResponse fetchApplicationSummary(Long applicationId) {
        try {
            return applicationServiceClient.getApplicationSummary(applicationId);
        } catch (Exception e) {
            throw new BusinessException("Không tìm thấy hồ sơ ứng tuyển");
        }
    }

    private void validateContractType(Long id) {
        boolean valid = masterDataServiceClient.getContractTypes().stream()
                .anyMatch(c -> c.id().equals(id));
        if (!valid) throw new BusinessException("Loại hợp đồng không hợp lệ");
    }

    /**
     * Offer do HR chot nen nguoi duyet cung la HR hoac Company Admin. Nguoi tao duoc phep tu duyet
     * offer cua chinh minh — day la quy tac nghiep vu da chot, khong phai thieu kiem tra.
     */
    private void validateApprover(Long approverId) {
        List<UserSummaryResponse> eligible = Stream.concat(
                authServiceClient.getUsers("RECRUITER").stream(),
                authServiceClient.getUsers("COMPANY_ADMIN").stream()
        ).toList();
        boolean valid = eligible.stream().anyMatch(u -> u.id().equals(approverId));
        if (!valid) {
            throw new BusinessException("Người duyệt phải là HR hoặc Company Admin");
        }
    }

    /**
     * Chan tao them offer khi tin tuyen dung da dung het so luong tuyen cua requisition.
     * Offer tao truoc khi co cot job_posting_id mang gia tri null nen khong tinh vao han muc.
     */
    private JobPostingSummaryResponse requireHeadcountAvailable(Long jobPostingId) {
        if (jobPostingId == null) return null;

        JobPostingSummaryResponse posting;
        try {
            posting = recruitmentServiceClient.getPosting(jobPostingId);
        } catch (Exception e) {
            throw new BusinessException("Không đọc được số lượng tuyển của tin tuyển dụng");
        }
        if (posting == null || posting.headcount() == null || posting.headcount() <= 0) return posting;

        long issued = offerRepository.countByJobPostingIdAndStatusInAndDeletedAtIsNull(
                jobPostingId, HEADCOUNT_CONSUMING);
        if (issued >= posting.headcount()) {
            throw new BusinessException(
                    "Tin tuyển dụng này đã dùng hết " + posting.headcount()
                            + " suất tuyển. Hãy hủy một offer đang xử lý trước khi tạo offer mới.");
        }
        return posting;
    }

    /** Best-effort: thieu so dien thoai khong duoc phep chan viec tao offer. */
    private String resolveCandidatePhone(Long candidateId) {
        try {
            return candidateServiceClient.getCandidateSummary(candidateId).phone();
        } catch (Exception e) {
            return null;
        }
    }

    private Map<Long, String> buildUserNameMap() {
        List<UserSummaryResponse> users = authServiceClient.getUsers(null);
        if (users == null) return Map.of();
        return users.stream()
                .collect(Collectors.toMap(UserSummaryResponse::id, UserSummaryResponse::fullName, (a, b) -> a));
    }

    private CandidateOfferResponse toCandidateResponse(
            Offer offer, Map<Long, String> contractTypeMap, Map<Long, String> reasonMap) {
        return new CandidateOfferResponse(
                offer.getId(),
                offer.getApplicationId(),
                offer.getCandidateNameSnapshot(),
                offer.getJobTitleSnapshot(),
                offer.getSalaryOffered(),
                offer.getContractTypeId(),
                contractTypeMap.get(offer.getContractTypeId()),
                offer.getStartDate(),
                offer.getProbationMonths(),
                offer.getResponseDeadline(),
                offer.getBenefits(),
                offer.getAllowance(),
                offer.getCandidateVisibleNote(),
                offer.getStatus(),
                offer.getDeclineReasonId() == null
                        ? null : reasonMap.get(offer.getDeclineReasonId()),
                offer.getDeclineNote(),
                offer.getCreatedAt());
    }

    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream()
                .collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }

    private Offer findById(Long id) {
        return offerRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy Offer"));
    }

    private OfferResponse toResponse(
            Offer o,
            Map<Long, String> userNameMap,
            Map<Long, String> contractTypeMap,
            Map<Long, String> reasonMap) {
        return new OfferResponse(
                o.getId(),
                o.getApplicationId(),
                o.getCandidateNameSnapshot() != null ? o.getCandidateNameSnapshot() : "N/A",
                o.getCandidateEmailSnapshot(),
                o.getCandidatePhoneSnapshot(),
                o.getJobTitleSnapshot(),
                o.getSalaryOffered(),
                o.getContractTypeId(),
                contractTypeMap.getOrDefault(o.getContractTypeId(), "N/A"),
                o.getStartDate(),
                o.getProbationMonths(),
                o.getReportingManager(),
                o.getWorkLocationId(),
                o.getCurrency(),
                o.getPayFrequency(),
                o.getPerformanceBonus(),
                o.getAnnualLeaveDays(),
                o.getResponseDeadline(),
                o.getBenefits(),
                o.getAllowance(),
                o.getNote(),
                o.getCandidateVisibleNote(),
                o.getRequesterId(),
                userNameMap.getOrDefault(o.getRequesterId(), "N/A"),
                o.getApproverId(),
                userNameMap.getOrDefault(o.getApproverId(), "N/A"),
                o.getStatus(),
                o.getRejectReason(),
                o.getDeclineReasonId() == null ? null : reasonMap.get(o.getDeclineReasonId()),
                o.getDeclineNote(),
                o.getCreatedAt(),
                o.getSubmittedAt(),
                o.getApprovedAt()
        );
    }
}
