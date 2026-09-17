package iuh.fit.se.interview.evaluation.dto;

import iuh.fit.se.interview.evaluation.RecommendationType;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ban nhap danh gia: moi truong deu tuy chon vi nguoi phong van co the luu giua chung.
 * Chi cac tieu chi da cham diem moi gui len — dong nao chua cham thi bo qua.
 */
public record EvaluationDraftRequest(
        RecommendationType overallRecommendation,
        String generalComment,
        BigDecimal salaryProposed,
        String salaryNote,
        @Valid List<EvaluationScoreRequest> scores
) {}
