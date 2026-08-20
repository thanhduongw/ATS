package iuh.fit.se.dashboard.dashboard.dto;

import java.util.List;
import java.util.Map;

public record DashboardSummaryResponse(
        long openPostingsCount,
        long activeRequisitionsCount,
        long totalCandidates,
        long totalApplications,
        long hiredCount,
        long rejectedCount,
        double successRatePercent,
        Map<String, Long> applicationsByStage,
        FunnelMetrics funnel,
        Double avgTimeToHireDays,
        List<SourceEffectiveness> sourceEffectiveness,
        List<StageConversion> pipelineConversion,
        List<RecruiterPerformance> recruiterPerformance
) {}