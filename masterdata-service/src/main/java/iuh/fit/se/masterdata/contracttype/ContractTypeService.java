package iuh.fit.se.masterdata.contracttype;

import iuh.fit.se.masterdata.contracttype.dto.ContractTypeRequest;
import iuh.fit.se.masterdata.contracttype.dto.ContractTypeResponse;
import iuh.fit.se.masterdata.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractTypeService {

    private final ContractTypeRepository repository;

    public List<ContractTypeResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ContractTypeResponse create(Long tenantId, ContractTypeRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Loại hợp đồng đã tồn tại");
        }
        ContractType saved = repository.save(ContractType.builder().tenantId(tenantId).name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public ContractTypeResponse update(Long tenantId, Long id, ContractTypeRequest req) {
        ContractType entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hợp đồng"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        ContractType entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hợp đồng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private ContractTypeResponse toResponse(ContractType e) {
        return new ContractTypeResponse(e.getId(), e.getName(), e.isActive());
    }
}