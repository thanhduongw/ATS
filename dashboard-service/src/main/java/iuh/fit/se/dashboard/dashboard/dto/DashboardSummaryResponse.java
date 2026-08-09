package iuh.fit.se.dashboard.dashboard.dto;

import java.util.Map;

public record DashboardSummaryResponse(
        long openPostingsCount,
        long activeRequisitionsCount,
        long totalCandidates,
        long totalApplications,
        long hiredCount,
        long rejectedCount,
        double successRatePercent,
        Map<String, Long> applicationsByStage
) {}