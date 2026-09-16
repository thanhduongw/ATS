package iuh.fit.se.interview.evaluation.dto;

import java.util.List;

/**
 * Danh gia cua mot ho so trong loat so sanh ung vien. Dung khi HR can doc danh gia cua nhieu
 * ho so thuoc cung mot tin tuyen dung ma khong muon goi lan luot tung ho so.
 */
public record ApplicationEvaluationsResponse(
        Long applicationId,
        List<EvaluationResponse> evaluations
) {}
