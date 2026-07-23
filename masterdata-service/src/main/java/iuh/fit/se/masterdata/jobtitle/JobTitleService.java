package iuh.fit.se.masterdata.jobtitle;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleRequest;
import iuh.fit.se.masterdata.jobtitle.dto.JobTitleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobTitleService {

    private final JobTitleRepository repository;

    public List<JobTitleResponse> getAll(Long tenantId) {
        return repository.findByTenantIdOrderByNameAsc(tenantId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public JobTitleResponse create(Long tenantId, JobTitleRequest req) {
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, req.name())) {
            throw new BusinessException("Chức vụ đã tồn tại");
        }
        JobTitle saved = repository.save(JobTitle.builder().tenantId(tenantId).name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public JobTitleResponse update(Long tenantId, Long id, JobTitleRequest req) {
        JobTitle entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy chức vụ"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        JobTitle entity = repository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy chức vụ"));
        entity.setActive(false);
        repository.save(entity);
    }

    private JobTitleResponse toResponse(JobTitle e) {
        return new JobTitleResponse(e.getId(), e.getName(), e.isActive());
    }
}