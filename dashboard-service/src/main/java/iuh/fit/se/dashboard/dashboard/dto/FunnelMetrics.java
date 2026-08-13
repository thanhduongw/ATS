package iuh.fit.se.dashboard.dashboard.dto;

public record FunnelMetrics(
        long requisitions,
        long postings,
        long applications,
        long interviews,
        long offers,
        long hired
) {}