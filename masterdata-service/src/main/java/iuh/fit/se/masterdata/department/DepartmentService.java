package iuh.fit.se.masterdata.department;

import iuh.fit.se.masterdata.department.dto.DepartmentRequest;
import iuh.fit.se.masterdata.department.dto.DepartmentResponse;
import iuh.fit.se.masterdata.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository repository;

    public List<DepartmentResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public DepartmentResponse create(Long tenantId, DepartmentRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Phòng ban đã tồn tại");
        }
        Department saved = repository.save(Department.builder()
                .tenantId(tenantId)
                .name(req.name())
                .description(req.description())
                .active(true)
                .build());
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse update(Long tenantId, Long id, DepartmentRequest req) {
        Department dept = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng ban"));
        dept.setName(req.name());
        dept.setDescription(req.description());
        return toResponse(repository.save(dept));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        Department dept = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng ban"));
        dept.setActive(false);
        repository.save(dept);
    }

    private DepartmentResponse toResponse(Department d) {
        return new DepartmentResponse(d.getId(), d.getName(), d.getDescription(), d.isActive());
    }
}