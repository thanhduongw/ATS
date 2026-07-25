package iuh.fit.se.recruitment.posting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JobPostingUpdateRequest(
        @NotBlank String title,
        @NotNull Long employmentTypeId,
        @NotNull Long workLocationId,
        @NotNull Long pipelineId,
        String description,
        String requirements,
        String benefits
) {}