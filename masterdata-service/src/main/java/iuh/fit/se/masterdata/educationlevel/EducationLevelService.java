package iuh.fit.se.masterdata.educationlevel;

import iuh.fit.se.masterdata.educationlevel.dto.EducationLevelRequest;
import iuh.fit.se.masterdata.educationlevel.dto.EducationLevelResponse;
import iuh.fit.se.masterdata.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EducationLevelService {

    private final EducationLevelRepository repository;

    public List<EducationLevelResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByOrderNoAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public EducationLevelResponse create(Long tenantId, EducationLevelRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Trình độ học vấn đã tồn tại");
        }
        EducationLevel saved = repository.save(EducationLevel.builder()
                .tenantId(tenantId).name(req.name()).orderNo(req.orderNo()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public EducationLevelResponse update(Long tenantId, Long id, EducationLevelRequest req) {
        EducationLevel entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trình độ học vấn"));
        entity.setName(req.name());
        entity.setOrderNo(req.orderNo());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        EducationLevel entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trình độ học vấn"));
        entity.setActive(false);
        repository.save(entity);
    }

    private EducationLevelResponse toResponse(EducationLevel e) {
        return new EducationLevelResponse(e.getId(), e.getName(), e.getOrderNo(), e.isActive());
    }
}