package iuh.fit.se.interview.evaluation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record EvaluationScoreRequest(
        @NotNull Long criteriaId,
        @NotNull @Min(1) @Max(5) Integer score,
        String comment
) {}