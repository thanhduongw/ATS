package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.*;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.common.PageResponse;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValue;
import iuh.fit.se.candidate.customfield.CandidateCustomFieldValueRepository;
import iuh.fit.se.candidate.customfield.CustomFieldDefinition;
import iuh.fit.se.candidate.customfield.CustomFieldDefinitionRepository;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.exception.BusinessException;
import iuh.fit.se.candidate.storage.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final CandidateSkillRepository candidateSkillRepository;
    private final CandidateTagRepository candidateTagRepository;
    private final CustomFieldDefinitionRepository customFieldDefinitionRepository;
    private final CandidateCustomFieldValueRepository customFieldValueRepository;
    private final MasterDataServiceClient masterDataServiceClient;
    private final S3Service s3Service;
    private final AuditEventPublisher auditEventPublisher;

    public PageResponse<CandidateResponse> getAll(
            Long tenantId, String keyword, Boolean hasCv, PoolStatus poolStatus, Integer page, Integer size) {
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels(tenantId));
        List<CatalogItemResponse> allSkills = masterDataServiceClient.getSkills(tenantId);
        Map<Long, String> skillMap = buildCatalogMap(allSkills);

        List<Long> matchedSkillIds = (keyword == null || keyword.isBlank())
                ? List.of()
                : allSkills.stream()
                        .filter(s -> s.name() != null && s.name().toLowerCase().contains(keyword.trim().toLowerCase()))
                        .map(CatalogItemResponse::id)
                        .toList();

        Specification<Candidate> spec = CandidateSpecifications.build(tenantId, keyword, hasCv, matchedSkillIds, poolStatus);

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

    public CandidateResponse getById(Long tenantId, Long id) {
        Candidate candidate = findOwned(tenantId, id);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels(tenantId));
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills(tenantId));
        return toResponse(candidate, educationMap, skillMap);
    }

    public CandidateSummaryResponse getSummaryById(Long tenantId, Long id) {
        Candidate candidate = findOwned(tenantId, id);
        return toSummary(candidate);
    }

    public CandidateSummaryResponse getSummaryByUserId(Long tenantId, Long userId) {
        Candidate candidate = candidateRepository
                .findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
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

    /**
     * Candidate lần đầu login: gắn userId vào candidate cùng email, hoặc tạo mới.
     */
    @Transactional
    public CandidateResponse linkOrCreateForUser(
            Long tenantId, Long userId, String email, String fullName) {

        var byUser = candidateRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId);
        if (byUser.isPresent()) {
            return getById(tenantId, byUser.get().getId());
        }

        var byEmail = candidateRepository.findByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(tenantId, email);
        if (byEmail.isPresent()) {
            Candidate c = byEmail.get();
            c.setUserId(userId);
            candidateRepository.save(c);
            return getById(tenantId, c.getId());
        }

        Candidate created = candidateRepository.save(Candidate.builder()
                .tenantId(tenantId)
                .userId(userId)
                .fullName(fullName != null ? fullName : email)
                .email(email)
                .build());
        return getById(tenantId, created.getId());
    }

    /** Candidate tự tạo/lấy hồ sơ của mình khi lần đầu vào hệ thống (self-service). */
    @Transactional
    public CandidateResponse getOrCreateMyProfile(Long tenantId, Long userId, CandidateSelfProfileRequest req) {
        Candidate candidate = candidateRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                .orElseGet(() -> {
                    // Nếu HR đã tạo sẵn candidate cùng email (import/seed) thì gắn userId vào, không tạo trùng
                    Candidate byEmail = candidateRepository
                            .findByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(tenantId, req.email())
                            .orElse(null);
                    if (byEmail != null) {
                        byEmail.setUserId(userId);
                        return candidateRepository.save(byEmail);
                    }
                    return candidateRepository.save(Candidate.builder()
                            .tenantId(tenantId)
                            .userId(userId)
                            .fullName(req.fullName())
                            .email(req.email())
                            .build());
                });
        return getById(tenantId, candidate.getId());
    }

    @Transactional
    public CandidateResponse create(Long tenantId, CandidateCreateRequest req) {
        if (candidateRepository.existsByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(tenantId, req.email())) {
            throw new BusinessException("Ứng viên với email này đã tồn tại trong hệ thống");
        }
        validateEducationLevel(tenantId, req.educationLevelId());
        validateSkills(tenantId, req.skillIds());

        Candidate candidate = candidateRepository.save(Candidate.builder()
                .tenantId(tenantId)
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
        saveCustomFields(tenantId, candidate, req.customFields());

        return getById(tenantId, candidate.getId());
    }

    @Transactional
    public CandidateResponse update(Long tenantId, Long id, CandidateUpdateRequest req) {
        Candidate candidate = findOwned(tenantId, id);
        validateEducationLevel(tenantId, req.educationLevelId());
        validateSkills(tenantId, req.skillIds());

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
        saveCustomFields(tenantId, candidate, req.customFields());

        return getById(tenantId, id);
    }

    @Transactional
    public CandidateResponse uploadCv(Long tenantId, Long id, MultipartFile file) {
        Candidate candidate = findOwned(tenantId, id);
        String url = s3Service.uploadFile(file, "candidates/" + tenantId + "/" + id);
        candidate.setCvFileUrl(url);
        candidateRepository.save(candidate);
        return getById(tenantId, id);
    }

    /** GDPR self-service: ứng viên tự yêu cầu xóa dữ liệu của mình. */
    @Transactional
    public void requestOwnDataDeletion(Long tenantId, Long userId) {
        Candidate candidate = candidateRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng viên của bạn"));
        candidate.setDeletedAt(LocalDateTime.now());
        candidateRepository.save(candidate);
        auditEventPublisher.publish(tenantId, userId, "CANDIDATE_SELF_DELETION_REQUEST", "CANDIDATE", candidate.getId(), null);
    }

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        Candidate candidate = findOwned(tenantId, id);
        candidate.setDeletedAt(LocalDateTime.now());
        candidateRepository.save(candidate);
        auditEventPublisher.publish(tenantId, actorUserId, "CANDIDATE_DELETED", "CANDIDATE", id, null);
    }

    @Transactional
    public BulkOperationResponse bulkDelete(Long tenantId, Long actorUserId, List<Long> ids) {
        List<Long> succeeded = new java.util.ArrayList<>();
        Map<Long, String> failed = new java.util.LinkedHashMap<>();
        for (Long id : ids) {
            try {
                softDelete(tenantId, id, actorUserId);
                succeeded.add(id);
            } catch (BusinessException e) {
                failed.put(id, e.getMessage());
            }
        }
        return new BulkOperationResponse(succeeded, failed);
    }

    /** Internal / Feign — application-service gọi khi reject hồ sơ, để đưa ứng viên vào Talent Pool. */
    @Transactional
    public void markPool(Long tenantId, Long id, String tag) {
        Candidate candidate = findOwned(tenantId, id);
        candidate.setPoolStatus(PoolStatus.IN_POOL);
        candidateRepository.save(candidate);
        addTagIfAbsent(candidate, tag);
    }

    @Transactional
    public CandidateResponse addTag(Long tenantId, Long id, String tag) {
        Candidate candidate = findOwned(tenantId, id);
        addTagIfAbsent(candidate, tag);
        return getById(tenantId, id);
    }

    @Transactional
    public CandidateResponse removeTag(Long tenantId, Long id, Long tagId) {
        Candidate candidate = findOwned(tenantId, id);
        candidate.getTags().removeIf(t -> t.getId().equals(tagId));
        candidateRepository.save(candidate);
        return getById(tenantId, id);
    }

    private void addTagIfAbsent(Candidate candidate, String tag) {
        if (tag == null || tag.isBlank()) return;
        String trimmed = tag.trim();
        if (candidateTagRepository.existsByCandidateIdAndTagIgnoreCase(candidate.getId(), trimmed)) return;
        candidateTagRepository.save(CandidateTag.builder().candidate(candidate).tag(trimmed).build());
    }

    private void saveCustomFields(Long tenantId, Candidate candidate, Map<String, String> customFields) {
        if (customFields == null || customFields.isEmpty()) return;

        Map<String, CustomFieldDefinition> activeDefsByKey = customFieldDefinitionRepository
                .findByTenantIdAndActiveTrue(tenantId).stream()
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
        skillIds.forEach(skillId -> candidateSkillRepository.save(
                CandidateSkill.builder().candidate(candidate).skillId(skillId).build()));
    }

    private void validateEducationLevel(Long tenantId, Long id) {
        if (id == null) return;
        boolean valid = masterDataServiceClient.getEducationLevels(tenantId).stream().anyMatch(e -> e.id().equals(id));
        if (!valid) throw new BusinessException("Trình độ học vấn không hợp lệ");
    }

    private void validateSkills(Long tenantId, List<Long> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) return;
        List<Long> validIds = masterDataServiceClient.getSkills(tenantId).stream().map(CatalogItemResponse::id).toList();
        boolean allValid = validIds.containsAll(skillIds);
        if (!allValid) throw new BusinessException("Danh sách kỹ năng chứa giá trị không hợp lệ");
    }

    private Map<Long, String> buildCatalogMap(List<CatalogItemResponse> items) {
        if (items == null) return Map.of();
        return items.stream().collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name, (a, b) -> a));
    }

    private Candidate findOwned(Long tenantId, Long id) {
        return candidateRepository.findByIdAndTenantIdAndDeletedAtIsNull(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));
    }

    private CandidateSummaryResponse toSummary(Candidate c) {
        return new CandidateSummaryResponse(
                c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getCvFileUrl(), c.getUserId());
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

    public CandidateResponse getOwnById(Long tenantId, Long userId, Long id) {
        Candidate candidate = findOwned(tenantId, id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể xem hồ sơ ứng viên khác");
        }
        return getById(tenantId, id);
    }

    @Transactional
    public CandidateResponse updateOwn(Long tenantId, Long userId, Long id, CandidateUpdateRequest req) {
        Candidate candidate = findOwned(tenantId, id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể cập nhật hồ sơ ứng viên khác");
        }
        return update(tenantId, id, req);
    }

    @Transactional
    public CandidateResponse uploadCvOwn(Long tenantId, Long userId, Long id, MultipartFile file) {
        Candidate candidate = findOwned(tenantId, id);
        if (candidate.getUserId() == null || !candidate.getUserId().equals(userId)) {
            throw new BusinessException("Không thể tải CV cho hồ sơ ứng viên khác");
        }
        return uploadCv(tenantId, id, file);
    }

    /**
     * Public apply: tìm candidate theo email, nếu chưa có thì tạo mới.
     */
    @Transactional
    public CandidateSummaryResponse findOrCreatePublic(Long tenantId, PublicCandidateCreateRequest req) {
        if (!req.consentGiven()) {
            throw new BusinessException("Vui lòng đồng ý cho phép lưu trữ thông tin để nộp hồ sơ");
        }

        Candidate candidate = candidateRepository
                .findByTenantIdAndEmailIgnoreCaseAndDeletedAtIsNull(tenantId, req.email().trim())
                .orElseGet(() -> candidateRepository.save(Candidate.builder()
                        .tenantId(tenantId)
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
    public CandidateSummaryResponse uploadCvPublic(Long tenantId, Long candidateId, MultipartFile file) {
        Candidate candidate = candidateRepository
                .findByIdAndTenantIdAndDeletedAtIsNull(candidateId, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));

        String url = s3Service.uploadFile(file, "cv/" + tenantId);
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