package iuh.fit.se.candidate.customfield;

import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionRequest;
import iuh.fit.se.candidate.customfield.dto.CustomFieldDefinitionResponse;
import iuh.fit.se.candidate.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomFieldDefinitionService {

    private final CustomFieldDefinitionRepository repository;

    public List<CustomFieldDefinitionResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByFieldLabelAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CustomFieldDefinitionResponse create(Long tenantId, CustomFieldDefinitionRequest req) {
        if (repository.existsByTenantIdAndFieldKeyIgnoreCase(tenantId, req.fieldKey())) {
            throw new BusinessException("Khóa trường tùy chỉnh đã tồn tại");
        }
        CustomFieldDefinition saved = repository.save(CustomFieldDefinition.builder()
                .tenantId(tenantId)
                .fieldKey(req.fieldKey())
                .fieldLabel(req.fieldLabel())
                .fieldType(req.fieldType())
                .active(true)
                .build());
        return toResponse(saved);
    }

    @Transactional
    public CustomFieldDefinitionResponse update(Long tenantId, Long id, CustomFieldDefinitionRequest req) {
        CustomFieldDefinition entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trường tùy chỉnh"));
        entity.setFieldLabel(req.fieldLabel());
        entity.setFieldType(req.fieldType());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        CustomFieldDefinition entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trường tùy chỉnh"));
        entity.setActive(false);
        repository.save(entity);
    }

    private CustomFieldDefinitionResponse toResponse(CustomFieldDefinition e) {
        return new CustomFieldDefinitionResponse(e.getId(), e.getFieldKey(), e.getFieldLabel(), e.getFieldType(), e.isActive());
    }
}
