package iuh.fit.se.candidate.candidate;

import iuh.fit.se.candidate.candidate.dto.CandidateCreateRequest;
import iuh.fit.se.candidate.candidate.dto.CandidateResponse;
import iuh.fit.se.candidate.candidate.dto.CandidateUpdateRequest;
import iuh.fit.se.candidate.client.MasterDataServiceClient;
import iuh.fit.se.candidate.client.dto.CatalogItemResponse;
import iuh.fit.se.candidate.exception.BusinessException;
import iuh.fit.se.candidate.storage.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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

    public List<CandidateResponse> getAll(Long tenantId) {
        List<Candidate> candidates = candidateRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels());
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills());
        return candidates.stream().map(c -> toResponse(c, educationMap, skillMap)).toList();
    }

    public CandidateResponse getById(Long tenantId, Long id) {
        Candidate candidate = findOwned(tenantId, id);
        Map<Long, String> educationMap = buildCatalogMap(masterDataServiceClient.getEducationLevels());
        Map<Long, String> skillMap = buildCatalogMap(masterDataServiceClient.getSkills());
        return toResponse(candidate, educationMap, skillMap);
    }

    @Transactional
    public CandidateResponse create(Long tenantId, CandidateCreateRequest req) {
        if (candidateRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, req.email())) {
            throw new BusinessException("Ứng viên với email này đã tồn tại trong hệ thống");
        }
        validateEducationLevel(req.educationLevelId());
        validateSkills(req.skillIds());

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

    private void attachSkills(Candidate candidate, List<Long> skillIds) {
        if (skillIds == null) return;
        skillIds.forEach(skillId -> candidateSkillRepository.save(
                CandidateSkill.builder().candidate(candidate).skillId(skillId).build()));
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
        return items.stream().collect(Collectors.toMap(CatalogItemResponse::id, CatalogItemResponse::name));
    }

    private Candidate findOwned(Long tenantId, Long id) {
        return candidateRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy ứng viên"));
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