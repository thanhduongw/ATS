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

    public List<ContractTypeResponse> getAll() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ContractTypeResponse create(ContractTypeRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Loại hợp đồng đã tồn tại");
        }
        ContractType saved = repository.save(ContractType.builder().name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public ContractTypeResponse update(Long id, ContractTypeRequest req) {
        ContractType entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hợp đồng"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        ContractType entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy loại hợp đồng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private ContractTypeResponse toResponse(ContractType e) {
        return new ContractTypeResponse(e.getId(), e.getName(), e.isActive());
    }
}
