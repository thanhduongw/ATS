package iuh.fit.se.masterdata.employmenttype;

import iuh.fit.se.masterdata.employmenttype.dto.EmploymentTypeRequest;
import iuh.fit.se.masterdata.employmenttype.dto.EmploymentTypeResponse;
import iuh.fit.se.masterdata.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmploymentTypeService {

    private final EmploymentTypeRepository repository;

    public List<EmploymentTypeResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public EmploymentTypeResponse create(Long tenantId, EmploymentTypeRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Loại hình làm việc đã tồn tại");
        }
        EmploymentType saved = repository.save(EmploymentType.builder()
                .tenantId(tenantId).name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public EmploymentTypeResponse update(Long tenantId, Long id, EmploymentTypeRequest req) {
        EmploymentType entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hình làm việc"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        EmploymentType entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hình làm việc"));
        entity.setActive(false);
        repository.save(entity);
    }

    private EmploymentTypeResponse toResponse(EmploymentType e) {
        return new EmploymentTypeResponse(e.getId(), e.getName(), e.isActive());
    }
}