package iuh.fit.se.masterdata.interviewcriteria;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.interviewcriteria.dto.InterviewCriteriaRequest;
import iuh.fit.se.masterdata.interviewcriteria.dto.InterviewCriteriaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InterviewCriteriaService {

    private final InterviewCriteriaRepository repository;

    public List<InterviewCriteriaResponse> getAll() {
        return repository.findAllByOrderByNameAsc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public InterviewCriteriaResponse create(InterviewCriteriaRequest req) {
        if (repository.existsByNameIgnoreCase(req.name())) {
            throw new BusinessException("Tiêu chí đánh giá đã tồn tại");
        }
        InterviewCriteria saved = repository.save(InterviewCriteria.builder()
                .name(req.name())
                .description(req.description())
                .active(true)
                .build());
        return toResponse(saved);
    }

    @Transactional
    public InterviewCriteriaResponse update(Long id, InterviewCriteriaRequest req) {
        InterviewCriteria criteria = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tiêu chí đánh giá"));
        criteria.setName(req.name());
        criteria.setDescription(req.description());
        return toResponse(repository.save(criteria));
    }

    @Transactional
    public void softDelete(Long id) {
        InterviewCriteria criteria = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy tiêu chí đánh giá"));
        criteria.setActive(false);
        repository.save(criteria);
    }

    private InterviewCriteriaResponse toResponse(InterviewCriteria c) {
        return new InterviewCriteriaResponse(c.getId(), c.getName(), c.getDescription(), c.isActive());
    }
}
