package iuh.fit.se.interview.evaluation.dto;

import iuh.fit.se.interview.evaluation.RecommendationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record EvaluationSubmitRequest(
        @NotNull(message = "Vui lòng chọn đề xuất tổng thể") RecommendationType overallRecommendation,
        String generalComment,
        @NotEmpty(message = "Phải chấm điểm ít nhất 1 tiêu chí") @Valid List<EvaluationScoreRequest> scores
) {}