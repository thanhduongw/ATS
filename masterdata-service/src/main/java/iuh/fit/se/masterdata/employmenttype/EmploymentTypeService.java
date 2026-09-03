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

    public List<EmploymentTypeResponse> getAll() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public EmploymentTypeResponse create(EmploymentTypeRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Loại hình làm việc đã tồn tại");
        }
        EmploymentType saved = repository.save(EmploymentType.builder()
                .name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public EmploymentTypeResponse update(Long id, EmploymentTypeRequest req) {
        EmploymentType entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hình làm việc"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        EmploymentType entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hình làm việc"));
        entity.setActive(false);
        repository.save(entity);
    }

    private EmploymentTypeResponse toResponse(EmploymentType e) {
        return new EmploymentTypeResponse(e.getId(), e.getName(), e.isActive());
    }
}
