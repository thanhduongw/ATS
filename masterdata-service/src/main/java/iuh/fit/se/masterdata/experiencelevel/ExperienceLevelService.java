package iuh.fit.se.masterdata.experiencelevel;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.experiencelevel.dto.ExperienceLevelRequest;
import iuh.fit.se.masterdata.experiencelevel.dto.ExperienceLevelResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExperienceLevelService {

    private final ExperienceLevelRepository repository;

    public List<ExperienceLevelResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByMinYearsAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ExperienceLevelResponse create(Long tenantId, ExperienceLevelRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Mức kinh nghiệm đã tồn tại");
        }
        if (req.maxYears() < req.minYears()) {
            throw new BusinessException("Số năm kinh nghiệm tối đa phải lớn hơn hoặc bằng tối thiểu");
        }
        ExperienceLevel saved = repository.save(ExperienceLevel.builder()
                .tenantId(tenantId).name(req.name())
                .minYears(req.minYears()).maxYears(req.maxYears()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public ExperienceLevelResponse update(Long tenantId, Long id, ExperienceLevelRequest req) {
        ExperienceLevel entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mức kinh nghiệm"));
        if (req.maxYears() < req.minYears()) {
            throw new BusinessException("Số năm kinh nghiệm tối đa phải lớn hơn hoặc bằng tối thiểu");
        }
        entity.setName(req.name());
        entity.setMinYears(req.minYears());
        entity.setMaxYears(req.maxYears());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        ExperienceLevel entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mức kinh nghiệm"));
        entity.setActive(false);
        repository.save(entity);
    }

    private ExperienceLevelResponse toResponse(ExperienceLevel e) {
        return new ExperienceLevelResponse(e.getId(), e.getName(), e.getMinYears(), e.getMaxYears(), e.isActive());
    }
}