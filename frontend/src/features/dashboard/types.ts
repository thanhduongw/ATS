export interface DashboardSummaryResponse {
    openPostingsCount: number;
    activeRequisitionsCount: number;
    totalCandidates: number;
    totalApplications: number;
    hiredCount: number;
    rejectedCount: number;
    successRatePercent: number;
    applicationsByStage: Record<string, number>;
}