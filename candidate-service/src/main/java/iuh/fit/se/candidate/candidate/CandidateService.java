package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateCreateRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateSelfProfileRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateSummaryResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateUpdateRequest;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.event.AuditEventPublisher;
import iuh.fit.se.candidate.exception.BusinessException;
import iuh.fit.se.candidate.storage.S3Service;
import lombok.RequiredArgsConstructor;
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
    private final MasterDataServiceClient masterDataServiceClient;
    private final S3Service s3Service;
    private final AuditEventPublisher auditEventPublisher;

    public List<CandidateResponse> getAll(Long tenantId) {
        List<Candidate> candidates = candidateRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels(tenantId));
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills(tenantId));
        return candidates.stream().map(c -> toResponse(c, educationMap, skillMap)).toList();
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

    /** Dùng bởi application-service (Feign) để resolve candidateId theo user đang login. */
    public CandidateSummaryResponse getSummaryByUserId(Long tenantId, Long userId) {
        Candidate candidate = candidateRepository
                .findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy hồ sơ ứng viên cho tài khoản này"));
        return new CandidateSummaryResponse(
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                candidate.getPhone(),
                candidate.getCvFileUrl()
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
                .build());

        attachSkills(candidate, req.skillIds());

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

        candidate.getSkills().clear();
        candidateRepository.save(candidate);
        attachSkills(candidate, req.skillIds());

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

    @Transactional
    public void softDelete(Long tenantId, Long id, Long actorUserId) {
        Candidate candidate = findOwned(tenantId, id);
        candidate.setDeletedAt(LocalDateTime.now());
        candidateRepository.save(candidate);
        auditEventPublisher.publish(tenantId, actorUserId, "CANDIDATE_DELETED", "CANDIDATE", id, null);
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
        return new CandidateSummaryResponse(c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getCvFileUrl());
    }

    private CandidateResponse toResponse(Candidate c, Map<Long, String> educationMap, Map<Long, String> skillMap) {
        List<Long> skillIds = c.getSkills().stream().map(CandidateSkill::getSkillId).toList();
        List<String> skillNames = skillIds.stream().map(sid -> skillMap.getOrDefault(sid, "N/A")).toList();

        return new CandidateResponse(
                c.getId(), c.getFullName(), c.getEmail(), c.getPhone(), c.getDateOfBirth(),
                c.getGender(), c.getAddress(), c.getCurrentPosition(),
                c.getEducationLevelId(), c.getEducationLevelId() == null ? null : educationMap.get(c.getEducationLevelId()),
                skillIds, skillNames, c.getCvFileUrl(), c.getCreatedAt()
        );
    }
}