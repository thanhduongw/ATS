package iuh.fit.se.masterdata.pipeline;

import iuh.fit.se.masterdata.exception.BusinessException;
import iuh.fit.se.masterdata.pipeline.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PipelineService {

    private final PipelineRepository pipelineRepository;

    public List<PipelineResponse> getAll(Long tenantId) {
        return pipelineRepository.findByTenantIdOrderByNameAsc(tenantId)
                .stream().map(this::toResponse).toList();
    }

    public PipelineResponse getById(Long tenantId, Long id) {
        return toResponse(findOwned(tenantId, id));
    }

    @Transactional
    public PipelineResponse create(Long tenantId, PipelineRequest req) {
        RecruitmentPipeline pipeline = RecruitmentPipeline.builder()
                .tenantId(tenantId)
                .name(req.name())
                .isDefault(false)
                .active(true)
                .build();

        req.stages().forEach(s -> pipeline.getStages().add(PipelineStage.builder()
                .pipeline(pipeline)
                .name(s.name())
                .stageType(s.stageType())
                .stageOrder(s.stageOrder())
                .build()));

        return toResponse(pipelineRepository.save(pipeline));
    }

    @Transactional
    public PipelineResponse update(Long tenantId, Long id, PipelineRequest req) {
        RecruitmentPipeline pipeline = findOwned(tenantId, id);
        pipeline.setName(req.name());

        // MVP: xóa toàn bộ stage cũ, thêm lại theo danh sách mới (đơn giản hơn diff từng phần tử)
        pipeline.getStages().clear();
        req.stages().forEach(s -> pipeline.getStages().add(PipelineStage.builder()
                .pipeline(pipeline)
                .name(s.name())
                .stageType(s.stageType())
                .stageOrder(s.stageOrder())
                .build()));

        return toResponse(pipelineRepository.save(pipeline));
    }

    @Transactional
    public void softDelete(Long tenantId, Long id) {
        RecruitmentPipeline pipeline = findOwned(tenantId, id);
        pipeline.setActive(false);
        pipelineRepository.save(pipeline);
    }

    private RecruitmentPipeline findOwned(Long tenantId, Long id) {
        return pipelineRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy quy trình tuyển dụng"));
    }

    private PipelineResponse toResponse(RecruitmentPipeline p) {
        List<PipelineStageResponse> stages = p.getStages().stream()
                .map(s -> new PipelineStageResponse(s.getId(), s.getName(), s.getStageType(), s.getStageOrder()))
                .toList();
        return new PipelineResponse(p.getId(), p.getName(), p.isDefault(), p.isActive(), stages);
    }
}