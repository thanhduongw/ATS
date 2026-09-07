package iuh.fit.se.masterdata.joblevel;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.joblevel.dto.JobLevelRequest;
import iuh.fit.se.masterdata.joblevel.dto.JobLevelResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobLevelService {

    private final JobLevelRepository repository;

    public List<JobLevelResponse> getAll() {
        return repository.findAllByOrderByOrderNoAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public JobLevelResponse create(JobLevelRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Cấp bậc đã tồn tại");
        }
        JobLevel saved = repository.save(JobLevel.builder()
                .name(req.name()).orderNo(req.orderNo()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public JobLevelResponse update(Long id, JobLevelRequest req) {
        JobLevel entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cấp bậc"));
        entity.setName(req.name());
        entity.setOrderNo(req.orderNo());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        JobLevel entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy cấp bậc"));
        entity.setActive(false);
        repository.save(entity);
    }

    private JobLevelResponse toResponse(JobLevel e) {
        return new JobLevelResponse(e.getId(), e.getName(), e.getOrderNo(), e.isActive());
    }
}
