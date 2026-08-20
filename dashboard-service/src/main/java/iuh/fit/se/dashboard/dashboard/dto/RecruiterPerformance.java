package iuh.fit.se.dashboard.dashboard.dto;

public record RecruiterPerformance(
        String recruiterName,
        long totalHandled,
        long hiredCount,
        double hireRatePercent
) {}
