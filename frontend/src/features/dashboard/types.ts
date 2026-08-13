export interface FunnelMetrics {
    requisitions: number;
    postings: number;
    applications: number;
    interviews: number;
    offers: number;
    hired: number;
}

export interface DashboardSummaryResponse {
    openPostingsCount: number;
    activeRequisitionsCount: number;
    totalCandidates: number;
    totalApplications: number;
    hiredCount: number;
    rejectedCount: number;
    successRatePercent: number;
    applicationsByStage: Record<string, number>;
    funnel?: FunnelMetrics;
}