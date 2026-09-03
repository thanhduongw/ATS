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

    public List<WorkLocationResponse> getAll() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public WorkLocationResponse create(WorkLocationRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Địa điểm làm việc đã tồn tại");
        }
        WorkLocation saved = repository.save(WorkLocation.builder()
                .name(req.name()).address(req.address()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public WorkLocationResponse update(Long id, WorkLocationRequest req) {
        WorkLocation entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy địa điểm làm việc"));
        entity.setName(req.name());
        entity.setAddress(req.address());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        WorkLocation entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy địa điểm làm việc"));
        entity.setActive(false);
        repository.save(entity);
    }

    private WorkLocationResponse toResponse(WorkLocation e) {
        return new WorkLocationResponse(e.getId(), e.getName(), e.getAddress(), e.isActive());
    }
}
