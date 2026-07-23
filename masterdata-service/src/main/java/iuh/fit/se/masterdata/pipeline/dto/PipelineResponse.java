package iuh.fit.se.masterdata.pipeline.dto;

import java.util.List;

public record PipelineResponse(
        Long id, String name, boolean isDefault, boolean active,
        List<PipelineStageResponse> stages
) {}