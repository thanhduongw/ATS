package iuh.fit.se.masterdata.rejectionreason;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.rejectionreason.dto.RejectionReasonRequest;
import iuh.fit.se.masterdata.rejectionreason.dto.RejectionReasonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RejectionReasonService {

    private final RejectionReasonRepository repository;

    public List<RejectionReasonResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public RejectionReasonResponse create(Long tenantId, RejectionReasonRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Lý do từ chối đã tồn tại");
        }
        RejectionReason saved = repository.save(RejectionReason.builder()
                .tenantId(tenantId).name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public RejectionReasonResponse update(Long tenantId, Long id, RejectionReasonRequest req) {
        RejectionReason entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lý do từ chối"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        RejectionReason entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lý do từ chối"));
        entity.setActive(false);
        repository.save(entity);
    }

    private RejectionReasonResponse toResponse(RejectionReason e) {
        return new RejectionReasonResponse(e.getId(), e.getName(), e.isActive());
    }
}