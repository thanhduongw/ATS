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

    public List<RecruitmentSourceResponse> getAll() {
        return repository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public RecruitmentSourceResponse create(RecruitmentSourceRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Nguồn tuyển dụng đã tồn tại");
        }
        RecruitmentSource saved = repository.save(RecruitmentSource.builder()
                .name(req.name()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public RecruitmentSourceResponse update(Long id, RecruitmentSourceRequest req) {
        RecruitmentSource entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nguồn tuyển dụng"));
        entity.setName(req.name());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        RecruitmentSource entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy nguồn tuyển dụng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private RecruitmentSourceResponse toResponse(RecruitmentSource e) {
        return new RecruitmentSourceResponse(e.getId(), e.getName(), e.isActive());
    }
}
