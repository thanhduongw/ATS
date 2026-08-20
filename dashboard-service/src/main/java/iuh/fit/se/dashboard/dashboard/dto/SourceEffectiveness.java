package iuh.fit.se.dashboard.dashboard.dto;

public record SourceEffectiveness(
        String sourceName,
        long totalApplications,
        long hiredCount,
        double hireRatePercent
) {}
