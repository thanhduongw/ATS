package iuh.fit.se.masterdata.recruitmentstatus;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.recruitmentstatus.dto.RecruitmentStatusRequest;
import iuh.fit.se.masterdata.recruitmentstatus.dto.RecruitmentStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecruitmentStatusService {

    private final RecruitmentStatusRepository repository;

    public List<RecruitmentStatusResponse> getAll() {
        return repository.findAllByOrderByOrderNoAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public RecruitmentStatusResponse create(RecruitmentStatusRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Trạng thái tuyển dụng đã tồn tại");
        }
        RecruitmentStatus saved = repository.save(RecruitmentStatus.builder()
                .name(req.name()).orderNo(req.orderNo()).active(true).build());
        return toResponse(saved);
    }

    @Transactional
    public RecruitmentStatusResponse update(Long id, RecruitmentStatusRequest req) {
        RecruitmentStatus entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trạng thái tuyển dụng"));
        entity.setName(req.name());
        entity.setOrderNo(req.orderNo());
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void softDelete(Long id) {
        RecruitmentStatus entity = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy trạng thái tuyển dụng"));
        entity.setActive(false);
        repository.save(entity);
    }

    private RecruitmentStatusResponse toResponse(RecruitmentStatus e) {
        return new RecruitmentStatusResponse(e.getId(), e.getName(), e.getOrderNo(), e.isActive());
    }
}
