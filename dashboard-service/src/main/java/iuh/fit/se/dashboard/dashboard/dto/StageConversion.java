package iuh.fit.se.dashboard.dashboard.dto;

/** Số ứng viên đã từng đạt tới stage này hoặc xa hơn (cumulative funnel), và tỉ lệ so với tổng số hồ sơ. */
public record StageConversion(
        String stageName,
        int stageOrder,
        long reachedCount,
        double percentOfTotal
) {}
