package iuh.fit.se.interview.evaluation.dto;

import iuh.fit.se.interview.evaluation.RecommendationType;

import java.time.LocalDateTime;
import java.util.List;

public record EvaluationResponse(
        Long interviewerId,
        String interviewerName,
        RecommendationType overallRecommendation,
        String generalComment,
        LocalDateTime submittedAt,
        List<ScoreDetail> scores
) {
    public record ScoreDetail(Long criteriaId, String criteriaName, Integer score, String comment) {}
}