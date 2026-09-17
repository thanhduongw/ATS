package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.*;
import iuh.fit.se.candidate.client.ApplicationServiceClient;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.common.PageResponse;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValue;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValueRepository;
import iuh.fit.se.candidate.customfield.CustomFieldDefinition;
import iuh.fit.se.candidate.customfield.CustomFieldDefinitionRepository;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.event.CandidateRegisteredEvent;
import iuh.fit.se.candidate.exception.BusinessException;
import iuh.fit.se.candidate.security.AuthorizationPolicy;
import iuh.fit.se.candidate.security.CurrentUser;
import iuh.fit.se.candidate.storage.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private static final long MAX_RESUME_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_RESUME_EXTENSIONS = Set.of("pdf", "doc", "docx");

    private final CandidateRepository candidateRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final CandidateSkillRepository candidateSkillRepository;
    private final CandidateTagRepository candidateTagRepository;
    private final CustomFieldDefinitionRepository customFieldDefinitionRepository;
    private final CandidateCustomFieldValueRepository customFieldValueRepository;
    private final MasterDataServiceClient masterDataServiceClient;
    private final S3Service s3Service;
    private final AuditEventPublisher auditEventPublisher;

    @Transactional
    public Candidate provisionRegisteredCandidate(CandidateRegisteredEvent event) {
        Candidate byUser = candidateRepository.findByUserIdAndDeletedAtIsNull(event.userId())
                .orElse(null);
        if (byUser != null) {
            return byUser;
        }

        Candidate byEmail = candidateRepository
                .findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(event.email())
                .orElse(null);
        if (byEmail != null) {
            if (byEmail.getUserId() != null && !byEmail.getUserId().equals(event.userId())) {
                throw new BusinessException("Candidate email is already linked to another user");
            }
            byEmail.setUserId(event.userId());
            if (byEmail.getPhone() == null) byEmail.setPhone(event.phone());
            return candidateRepository.save(byEmail);
        }

        return candidateRepository.save(Candidate.builder()
                .userId(event.userId())
                .fullName(event.fullName())
                .email(event.email())
                .phone(event.phone())
                .build());
    }

    public PageResponse<CandidateResponse> getAll(
            CurrentUser actor, String keyword, Boolean hasCv,
            PoolStatus poolStatus, Integer page, Integer size) {
        AuthorizationPolicy.requireInternal(actor);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels());
        List<CatalogItemResponse> allSkills = masterDataServiceClient.getSkills();
        Map<Long, String> skillMap = buildCatalogMap(allSkills);

        List<Long> matchedSkillIds = (keyword == null || keyword.isBlank())
                ? List.of()
                : allSkills.stream()
                        .filter(s -> s.name() != null && s.name().toLowerCase().contains(keyword.trim().toLowerCase()))
                        .map(CatalogItemResponse::id)
                        .toList();

        Specification<Candidate> spec = CandidateSpecifications.build(keyword, hasCv, matchedSkillIds, poolStatus);
        // COMPANY_ADMIN va HR (RECRUITER) xem duoc toan bo kho ung vien, ke ca ung vien
        // chua nop don nao (talent pool) - nen khong loc theo danh sach ung vien co the tiep can.
        if (!seesEveryCandidate(actor)) {
            Set<Long> accessibleIds = loadAccessibleCandidateIds();
            if (accessibleIds.isEmpty()) {
                return emptyPage(page, size);
            }
            spec = spec.and(CandidateSpecifications.accessibleIds(accessibleIds));
        }

        if (page == null && size == null) {
            List<Candidate> candidates = candidateRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
            return PageResponse.unpaged(candidates.stream().map(c -> toResponse(c, educationMap, skillMap)).toList());
        }

        Pageable pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 10,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Candidate> result = candidateRepository.findAll(spec, pageable);
        return PageResponse.of(result.map(c -> toResponse(c, educationMap, skillMap)));
    }

    public CandidateResponse getById(Long id) {
        Candidate candidate = findById(id);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels());
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills());
        return toResponse(candidate, educationMap, skillMap);
    }

    public CandidateResponse getByIdForActor(Long id, CurrentUser actor) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        return getById(candidate.getId());
    }

    public CandidateSummaryResponse getSummaryById(Long id) {
        Candidate candidate = findById(id);
        return toSummary(candidate);
    }

    public CandidateSummaryResponse getSummaryByIdForActor(Long id, CurrentUser actor) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        return toSummary(candidate);
    }

    private void authorizeCandidateRecord(CurrentUser actor, Candidate candidate) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        if (role == AuthorizationPolicy.Role.CANDIDATE) {
            AuthorizationPolicy.requireSelf(actor, candidate.getUserId());
            return;
        }
        AuthorizationPolicy.requireInternal(actor);
        if (!seesEveryCandidate(actor)
                && !loadAccessibleCandidateIds().contains(candidate.getId())) {
            throw new AccessDeniedException("Candidate is outside the user's department or assignment scope");
        }
    }

    /** COMPANY_ADMIN va HR (RECRUITER) tiep can toan bo ung vien cua cong ty. */
    private boolean seesEveryCandidate(CurrentUser actor) {
        AuthorizationPolicy.Role role = AuthorizationPolicy.roleOf(actor);
        return role == AuthorizationPolicy.Role.COMPANY_ADMIN
                || role == AuthorizationPolicy.Role.RECRUITER;
    }

    public CandidateSummaryResponse getSummaryByUserId(Long userId) {
        Candidate candidate = candidateRepository
                .findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng viên cho tài khoản này"));
        return new CandidateSummaryResponse(
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhone(),
                candidate.getCvFileUrl(),
                candidate.getUserId()
        );
    }

    public CandidateSummaryResponse getSummaryByUserIdForActor(
            Long userId, CurrentUser actor) {
        Candidate candidate = candidateRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng viên cho tài khoản này"));
        authorizeCandidateRecord(actor, candidate);
        return toSummary(candidate);
    }

    public CandidateSelfResponse getMyProfile(CurrentUser actor) {
        AuthorizationPolicy.requireCandidate(actor);
        Candidate candidate = findByUserId(actor.userId());
        return toSelfResponse(candidate);
    }

    @Transactional
    public CandidateSelfResponse updateMyProfile(
            CurrentUser actor, CandidateSelfUpdateRequest request) {
        AuthorizationPolicy.requireCandidate(actor);
        Candidate candidate = findByUserId(actor.userId());
        validateEducationLevel(request.educationLevelId());
        validateSkills(request.skillIds());

        candidate.setFullName(request.fullName().trim());
        candidate.setPhone(trimToNull(request.phone()));
        candidate.setDateOfBirth(request.dateOfBirth());
        candidate.setGender(trimToNull(request.gender()));
        candidate.setAddress(trimToNull(request.address()));
        candidate.setCurrentPosition(trimToNull(request.currentPosition()));
        candidate.setEducationLevelId(request.educationLevelId());
        candidate.getSkills().clear();
        candidateRepository.save(candidate);
        attachSkills(candidate, request.skillIds());

        return toSelfResponse(candidate);
    }

    @Transactional
    public CandidateSelfResponse uploadMyResume(
            CurrentUser actor, MultipartFile file) {
        AuthorizationPolicy.requireCandidate(actor);
        validateResume(file);
        Candidate candidate = findByUserId(actor.userId());
        String url = s3Service.uploadFile(
                file, "candidates/" + candidate.getId());
        candidate.setCvFileUrl(url);
        candidateRepository.save(candidate);
        return toSelfResponse(candidate);
    }

    /**
     * Candidate lần đầu login: gắn userId vào candidate cùng email, hoặc tạo mới.
     */
    @Transactional
    public CandidateResponse linkOrCreateForUser(
            Long userId, String email, String fullName) {

        var byUser = candidateRepository.findByUserIdAndDeletedAtIsNull(userId);
        if (byUser.isPresent()) {
            return getById(byUser.get().getId());
        }

        var byEmail = candidateRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(email);
        if (byEmail.isPresent()) {
            Candidate c = byEmail.get();
            c.setUserId(userId);
            candidateRepository.save(c);
            return getById(c.getId());
        }

        Candidate created = candidateRepository.save(Candidate.builder()
                .userId(userId)
                .fullName(fullName != null ? fullName : email)
                .email(email)
                .build());
        return getById(created.getId());
    }

    /** Candidate tự tạo/lấy hồ sơ của mình khi lần đầu vào hệ thống (self-service). */
    @Transactional
    public CandidateResponse getOrCreateMyProfile(Long userId, CandidateSelfProfileRequest req) {
        Candidate candidate = candidateRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseGet(() -> {
                    // Nếu HR đã tạo sẵn candidate cùng email (import/seed) thì gắn userId vào, không tạo trùng
                    Candidate byEmail = candidateRepository
                            .findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(req.email())
                            .orElse(null);
                    if (byEmail != null) {
                        byEmail.setUserId(userId);
                        return candidateRepository.save(byEmail);
                    }
                    return candidateRepository.save(Candidate.builder()
                            .userId(userId)
                            .fullName(req.fullName())
                            .email(req.email())
                            .build());
                });
        return getById(candidate.getId());
    }

    @Transactional
    public CandidateResponse create(CurrentUser actor, CandidateCreateRequest req) {
        AuthorizationPolicy.requireAdmin(actor);
        if (candidateRepository.existsByEmailIgnoreCaseAndDeletedAtIsNull(req.email())) {
            throw new BusinessException("Ứng viên với email này đã tồn tại trong hệ thống");
        }
        validateEducationLevel(req.educationLevelId());
        validateSkills(req.skillIds());

        Candidate candidate = candidateRepository.save(Candidate.builder()
                .fullName(req.fullName())
                .email(req.email())
                .phone(req.phone())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .address(req.address())
                .currentPosition(req.currentPosition())
                .educationLevelId(req.educationLevelId())
                .internalNote(req.internalNote())
                .build());

        attachSkills(candidate, req.skillIds());
        saveCustomFields(candidate, req.customFields());

        return getById(candidate.getId());
    }

    @Transactional
    public CandidateResponse update(Long id, CurrentUser actor, CandidateUpdateRequest req) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        return updateCandidate(candidate, req);
    }

    private CandidateResponse updateCandidate(
            Candidate candidate, CandidateUpdateRequest req) {
        validateEducationLevel(req.educationLevelId());
        validateSkills(req.skillIds());

        candidate.setFullName(req.fullName());
        candidate.setEmail(req.email());
        candidate.setPhone(req.phone());
        candidate.setDateOfBirth(req.dateOfBirth());
        candidate.setGender(req.gender());
        candidate.setAddress(req.address());
        candidate.setCurrentPosition(req.currentPosition());
        candidate.setEducationLevelId(req.educationLevelId());
        candidate.setInternalNote(req.internalNote());

        candidate.getSkills().clear();
        candidateRepository.save(candidate);
        attachSkills(candidate, req.skillIds());
        saveCustomFields(candidate, req.customFields());

        return getById(candidate.getId());
    }

    @Transactional
    public CandidateResponse uploadCv(Long id, CurrentUser actor, MultipartFile file) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        return uploadCandidate(candidate, file);
    }

    private CandidateResponse uploadCandidate(
            Candidate candidate, MultipartFile file) {
        Long id = candidate.getId();
        String url = s3Service.uploadFile(file, "candidates/" + id);
        candidate.setCvFileUrl(url);
        candidateRepository.save(candidate);
        return getById(id);
    }

    /** GDPR self-service: ứng viên tự yêu cầu xóa dữ liệu của mình. */
    @Transactional
    public void requestOwnDataDeletion(Long userId) {
        Candidate candidate = candidateRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng viên của bạn"));
        candidate.setDeletedAt(LocalDateTime.now());
        candidateRepository.save(candidate);
        auditEventPublisher.publish(userId, "CANDIDATE_SELF_DELETION_REQUEST", "CANDIDATE", candidate.getId(), null);
    }

    @Transactional
    public void softDelete(Long id, CurrentUser actor) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        candidate.setDeletedAt(LocalDateTime.now());
        candidateRepository.save(candidate);
        auditEventPublisher.publish(actor.userId(), "CANDIDATE_DELETED", "CANDIDATE", id, null);
    }

    @Transactional
    public BulkOperationResponse bulkDelete(CurrentUser actor, List<Long> ids) {
        List<Long> succeeded = new java.util.ArrayList<>();
        Map<Long, String> failed = new java.util.LinkedHashMap<>();
        for (Long id : ids) {
            try {
                softDelete(id, actor);
                succeeded.add(id);
            } catch (BusinessException e) {
                failed.put(id, e.getMessage());
            }
        }
        return new BulkOperationResponse(succeeded, failed);
    }

    /** Internal / Feign — application-service gọi khi reject hồ sơ, để đưa ứng viên vào Talent Pool. */
    @Transactional
    public void markPool(Long id, CurrentUser actor, String tag) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        candidate.setPoolStatus(PoolStatus.IN_POOL);
        candidateRepository.save(candidate);
        addTagIfAbsent(candidate, tag);
    }

    @Transactional
    public CandidateResponse addTag(Long id, CurrentUser actor, String tag) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        addTagIfAbsent(candidate, tag);
        return getById(id);
    }

    @Transactional
    public CandidateResponse removeTag(Long id, CurrentUser actor, Long tagId) {
        Candidate candidate = findById(id);
        authorizeCandidateRecord(actor, candidate);
        candidate.getTags().removeIf(t -> t.getId().equals(tagId));
        candidateRepository.save(candidate);
        return getById(id);
    }

    private void addTagIfAbsent(Candidate candidate, String tag) {
        if (tag == null || tag.isBlank()) return;
        String trimmed = tag.trim();
        if (candidateTagRepository.existsByCandidateIdAndTagIgnoreCase(candidate.getId(), trimmed)) return;
        candidateTagRepository.save(CandidateTag.builder().candidate(candidate).tag(trimmed).build());
    }

    private void saveCustomFields(Candidate candidate, Map<String, String> customFields) {
        if (customFields == null || customFields.isEmpty()) return;

        Map<String, CustomFieldDefinition> activeDefsByKey = customFieldDefinitionRepository
                .findByActiveTrue().stream()
                .collect(Collectors.toMap(CustomFieldDefinition::getFieldKey, d -> d));

        customFields.forEach((key, value) -> {
            CustomFieldDefinition def = activeDefsByKey.get(key);
            if (def == null) {
                throw new BusinessException("Trường tùy chỉnh không hợp lệ: " + key);
            }
            CandidateCustomFieldValue existing = customFieldValueRepository
                    .findByCandidateIdAndFieldDefinitionId(candidate.getId(), def.getId())
                    .orElse(null);
            if (existing != null) {
                existing.setValue(value);
                customFieldValueRepository.save(existing);
            } else {
                customFieldValueRepository.save(CandidateCustomFieldValue.builder()
                        .candidate(candidate)
                        .fieldDefinition(def)
                        .value(value)
                        .build());
            }
        });
    }

    private Map<String, String> loadCustomFields(Long candidateId) {
        return customFieldValueRepository.findByCandidateId(candidateId).stream()
                .collect(Collectors.toMap(
                        v -> v.getFieldDefinition().getFieldKey(),
                        v -> v.getValue() != null ? v.getValue() : "",
                        (a, b) -> a));
    }

    private void attachSkills(Candidate candidate, List<Long> skillIds) {
        if (skillIds == null) return;
        skillIds.forEach(skillId -> {
            CandidateSkill skill = candidateSkillRepository.save(
                    CandidateSkill.builder().candidate(candidate).skillId(skillId).build());
            candidate.getSkills().add(skill);
        });
    }

    private void validateEducationLevel(Long id) {
        if (id == null) return;
        boolean valid = masterDataServiceClient.getEducationLevels().stream().anyMatch(e -> e.id().equals(id));
        if (!valid) throw new BusinessException("Trình độ học vấn không hợp lệ");
    }

    private void validateSkills(List<Long> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) return;
        List<Long> validIds = masterDataServiceClient.getSkills().stream().map(CatalogItemResponse::id).toList();
        boolean allValid = validIds.containsAll(skillIds);
        if (!allValid) throw new BusinessException("Danh sách kỹ năng chứa giá trị không hợp lệ");
    }

    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }

    private Candidate findById(Long id) {
        return candidateRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));
    }

    private Candidate findByUserId(Long userId) {
        return candidateRepository.findByUserIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new BusinessException(
                        "Khong tim thay ho so ung vien gan voi tai khoan"));
    }

    private void validateResume(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("CV khong duoc de trong");
        }
        if (file.getSize() > MAX_RESUME_SIZE_BYTES) {
            throw new BusinessException("CV vuot qua dung luong toi da 10 MB");
        }
        String filename = file.getOriginalFilename();
        int extensionSeparator = filename == null ? -1 : filename.lastIndexOf('.');
        String extension = extensionSeparator < 0
                ? ""
                : filename.substring(extensionSeparator + 1).toLowerCase(java.util.Locale.ROOT);
        if (!ALLOWED_RESUME_EXTENSIONS.contains(extension)) {
            throw new BusinessException("CV chi chap nhan dinh dang PDF, DOC hoac DOCX");
        }
    }

    public void requireCvFileAccess(CurrentUser actor, String fileName) {
        Candidate candidate = candidateRepository
                .findFirstByCvFileUrlEndingWithAndDeletedAtIsNull(fileName)
                .orElseThrow(() -> new BusinessException("Không tìm thấy CV"));
        authorizeCandidateRecord(actor, candidate);
    }

    private Set<Long> loadAccessibleCandidateIds() {
        try {
            Set<Long> ids = applicationServiceClient.getAccessibleCandidateIds();
            return ids != null ? ids : Set.of();
        } catch (AccessDeniedException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AccessDeniedException("Cannot verify candidate department scope", exception);
        }
    }

    private PageResponse<CandidateResponse> emptyPage(Integer page, Integer size) {
        if (page == null && size == null) {
            return PageResponse.unpaged(List.of());
        }
        int pageNumber = page != null ? page : 0;
        int pageSize = size != null ? size : 10;
        return new PageResponse<>(List.of(), 0, 0, pageNumber, pageSize);
    }

    private CandidateSummaryResponse toSummary(Candidate c) {
        return new CandidateSummaryResponse(
                c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getCvFileUrl(), c.getUserId());
    }

    private CandidateSelfResponse toSelfResponse(Candidate candidate) {
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels());
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills());
        List<Long> skillIds = candidate.getSkills().stream().map(CandidateSkill::getSkillId).toList();
        List<String> skillNames = skillIds.stream()
                .map(id -> skillMap.getOrDefault(id, "N/A"))
                .toList();
        return new CandidateSelfResponse(
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhone(),
                candidate.getDateOfBirth(),
                candidate.getGender(),
                candidate.getAddress(),
                candidate.getCurrentPosition(),
                candidate.getEducationLevelId(),
                candidate.getEducationLevelId() == null
                        ? null : educationMap.get(candidate.getEducationLevelId()),
                skillIds,
                skillNames,
                candidate.getCvFileUrl() != null,
                candidate.getCvFileUrl());
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private CandidateResponse toResponse(Candidate c, Map<Long, String> educationMap, Map<Long, String> skillMap) {
        List<Long> skillIds = c.getSkills().stream().map(CandidateSkill::getSkillId).toList();
        List<String> skillNames = skillIds.stream().map(sid -> skillMap.getOrDefault(sid, "N/A")).toList();

        return new CandidateResponse(
                c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getDateOfBirth(),
                c.getGender(), c.getAddress(), c.getCurrentPosition(),
                c.getEducationLevelId(), c.getEducationLevelId() == null ? null : educationMap.get(c.getEducationLevelId()),
                skillIds, skillNames, c.getCvFileUrl(), c.getInternalNote(),
                c.getPoolStatus().name(),
                c.getTags().stream().map(t -> new CandidateTagResponse(t.getId(), t.getTag())).toList(),
                loadCustomFields(c.getId()),
                c.getCreatedAt()
        );
    }

    public CandidateResponse getOwnById(Long userId, Long id) {
        Candidate candidate = findById(id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể xem hồ sơ ứng viên khác");
        }
        return getById(id);
    }

    @Transactional
    public CandidateResponse updateOwn(Long userId, Long id, CandidateUpdateRequest req) {
        Candidate candidate = findById(id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể cập nhật hồ sơ ứng viên khác");
        }
        return updateCandidate(candidate, req);
    }

    @Transactional
    public CandidateResponse uploadCvOwn(Long userId, Long id, MultipartFile file) {
        Candidate candidate = findById(id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể tải CV cho hồ sơ ứng viên khác");
        }
        return uploadCandidate(candidate, file);
    }

    /**
     * Public apply: tìm candidate theo email, nếu chưa có thì tạo mới.
     */
    @Transactional
    public CandidateSummaryResponse findOrCreatePublic(PublicCandidateCreateRequest req) {
        if (!req.consentGiven()) {
            throw new BusinessException("Vui lòng đồng ý cho phép lưu trữ thông tin để nộp hồ sơ");
        }

        Candidate candidate = candidateRepository
                .findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByIdAsc(req.email().trim())
                .orElseGet(() -> candidateRepository.save(Candidate.builder()
                        .fullName(req.fullName().trim())
                        .email(req.email().trim().toLowerCase())
                        .phone(req.phone() != null ? req.phone().trim() : null)
                        .consentGiven(true)
                        .consentAt(LocalDateTime.now())
                        .build()));

        // Cập nhật tên/phone nếu đã tồn tại (ứng viên sửa lại)
        boolean changed = false;
        if (req.fullName() != null && !req.fullName().isBlank()
                && !req.fullName().trim().equals(candidate.getFullName())) {
            candidate.setFullName(req.fullName().trim());
            changed = true;
        }
        if (req.phone() != null && !req.phone().isBlank()
                && !req.phone().trim().equals(candidate.getPhone())) {
            candidate.setPhone(req.phone().trim());
            changed = true;
        }
        if (!Boolean.TRUE.equals(candidate.getConsentGiven())) {
            candidate.setConsentGiven(true);
            candidate.setConsentAt(LocalDateTime.now());
            changed = true;
        }
        if (changed) {
            candidateRepository.save(candidate);
        }

        return new CandidateSummaryResponse(
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhone(),
                candidate.getCvFileUrl(),
                candidate.getUserId()
        );
    }

    /**
     * Public apply: upload CV, gắn vào candidate.
     */
    @Transactional
    public CandidateSummaryResponse uploadCvPublic(Long candidateId, MultipartFile file) {
        Candidate candidate = candidateRepository
                .findByIdAndDeletedAtIsNull(candidateId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));

        String url = s3Service.uploadFile(file, "candidates/" + candidateId);
        candidate.setCvFileUrl(url);
        candidateRepository.save(candidate);

        return new CandidateSummaryResponse(
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhone(),
                candidate.getCvFileUrl(),
                candidate.getUserId()
        );
    }
}
