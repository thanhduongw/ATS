package iuh.fit.se.interview.evaluation.dto;

import iuh.fit.se.interview.evaluation.RecommendationType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record EvaluationResponse(
        Long interviewerId,
        String interviewerName,
        RecommendationType overallRecommendation,
        String generalComment,
        BigDecimal salaryProposed,
        String salaryNote,
        LocalDateTime submittedAt,
        List<EvaluationScoreResponse> scores
) {}