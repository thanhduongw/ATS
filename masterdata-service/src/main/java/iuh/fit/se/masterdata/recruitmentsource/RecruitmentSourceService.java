package iuh.fit.se.masterdata.recruitmentsource;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.recruitmentsource.dto.RecruitmentSourceRequest;
import iuh.fit.se.masterdata.recruitmentsource.dto.RecruitmentSourceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecruitmentSourceService {

    private final RecruitmentSourceRepository repository;

    public List<RecruitmentSourceResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public RecruitmentSourceResponse create(Long tenantId, RecruitmentSourceRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Nguồn tuyển dụng đã tồn tại");
        }
        RecruitmentSource saved = repository.save(RecruitmentSource.builder()
                .tenantId(tenantId).name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public RecruitmentSourceResponse update(Long tenantId, Long id, RecruitmentSourceRequest req) {
        RecruitmentSource entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nguồn tuyển dụng"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        RecruitmentSource entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nguồn tuyển dụng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private RecruitmentSourceResponse toResponse(RecruitmentSource e) {
        return new RecruitmentSourceResponse(e.getId(), e.getName(), e.isActive());
    }
}