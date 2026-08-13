package iuh.fit.se.interview.evaluation.dto;

public record EvaluationScoreResponse(
        Long criteriaId,
        String criteriaName,
        Integer score,
        String comment
) {}