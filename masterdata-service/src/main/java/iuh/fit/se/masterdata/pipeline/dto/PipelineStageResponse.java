package iuh.fit.se.masterdata.pipeline.dto;

import iuh.fit.se.masterdata.pipeline.enums.StageType;

public record PipelineStageResponse(
        Long id, String name, StageType stageType, Integer stageOrder
) {}