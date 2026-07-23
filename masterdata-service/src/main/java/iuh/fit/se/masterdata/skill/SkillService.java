package iuh.fit.se.masterdata.skill;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.skill.dto.SkillRequest;
import iuh.fit.se.masterdata.skill.dto.SkillResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository repository;

    public List<SkillResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SkillResponse create(Long tenantId, SkillRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Kỹ năng đã tồn tại");
        }
        Skill saved = repository.save(Skill.builder()
                .tenantId(tenantId).name(req.name()).category(req.category()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public SkillResponse update(Long tenantId, Long id, SkillRequest req) {
        Skill entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy kỹ năng"));
        entity.setName(req.name());
        entity.setCategory(req.category());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        Skill entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy kỹ năng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private SkillResponse toResponse(Skill e) {
        return new SkillResponse(e.getId(), e.getName(), e.getCategory(), e.isActive());
    }
}