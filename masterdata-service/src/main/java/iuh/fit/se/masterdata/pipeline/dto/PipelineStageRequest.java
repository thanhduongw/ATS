package iuh.fit.se.masterdata.pipeline.dto;

import iuh.fit.se.masterdata.pipeline.enums.StageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PipelineStageRequest(
        @NotBlank String name,
        @NotNull StageType stageType,
        @NotNull Integer stageOrder
) {}