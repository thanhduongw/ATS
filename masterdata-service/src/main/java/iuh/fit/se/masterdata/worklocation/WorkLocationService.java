package iuh.fit.se.masterdata.worklocation;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.worklocation.dto.WorkLocationRequest;
import iuh.fit.se.masterdata.worklocation.dto.WorkLocationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkLocationService {

    private final WorkLocationRepository repository;

    public List<WorkLocationResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public WorkLocationResponse create(Long tenantId, WorkLocationRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Địa điểm làm việc đã tồn tại");
        }
        WorkLocation saved = repository.save(WorkLocation.builder()
                .tenantId(tenantId).name(req.name()).address(req.address()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public WorkLocationResponse update(Long tenantId, Long id, WorkLocationRequest req) {
        WorkLocation entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy địa điểm làm việc"));
        entity.setName(req.name());
        entity.setAddress(req.address());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        WorkLocation entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy địa điểm làm việc"));
        entity.setActive(false);
        repository.save(entity);
    }

    private WorkLocationResponse toResponse(WorkLocation e) {
        return new WorkLocationResponse(e.getId(), e.getName(), e.getAddress(), e.isActive());
    }
}