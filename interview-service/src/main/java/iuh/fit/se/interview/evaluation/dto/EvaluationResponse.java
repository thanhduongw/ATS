package iuh.fit.se.interview.evaluation.dto;

import iuh.fit.se.interview.evaluation.RecommendationType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record EvaluationResponse(
        Long id,
        /** Buoi phong van duoc cham; null khi day la bai HR cham cho ca vong khong co phong van. */
        Long interviewId,
        Long interviewerId,
        String interviewerName,
        RecommendationType overallRecommendation,
        String generalComment,
        BigDecimal salaryProposed,
        String salaryNote,
        LocalDateTime submittedAt,
        /**
         * Nguoi goi co duoc doc noi dung bai cham nay khong. Bang false khi dong danh gia
         * ton tai nhung bi che (dong nghiep chua nop, hoac minh chua nop bai cua minh) —
         * luc do chi con interviewerId, interviewerName va submittedAt la co nghia.
         */
        boolean contentVisible,
        List<EvaluationScoreResponse> scores
) {}