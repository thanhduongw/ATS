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

    public List<DepartmentResponse> getAll() {
        return repository.findAllByOrderByNameAsc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public boolean existsActive(Long id) {
        return repository.findById(id)
                .map(Department::isActive)
                .orElse(false);
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Phòng ban đã tồn tại");
        }
        Department saved = repository.save(Department.builder()
                .name(req.name())
                .description(req.description())
                .active(true)
                .build());
        return toResponse(saved);
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest req) {
        Department dept = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng ban"));
        dept.setName(req.name());
        dept.setDescription(req.description());
        return toResponse(repository.save(dept));
    }

    @Transactional
    public void softDelete(Long id) {
        Department dept = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phòng ban"));
        dept.setActive(false);
        repository.save(dept);
    }

    private DepartmentResponse toResponse(Department d) {
        return new DepartmentResponse(d.getId(), d.getName(), d.getDescription(), d.isActive());
    }
}
