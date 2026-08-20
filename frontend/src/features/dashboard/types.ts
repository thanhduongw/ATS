export interface FunnelMetrics {
    requisitions: number;
    postings: number;
    applications: number;
    interviews: number;
    offers: number;
    hired: number;
}

export interface SourceEffectiveness {
    sourceName: string;
    totalApplications: number;
    hiredCount: number;
    hireRatePercent: number;
}

export interface StageConversion {
    stageName: string;
    stageOrder: number;
    reachedCount: number;
    percentOfTotal: number;
}

export interface RecruiterPerformance {
    recruiterName: string;
    totalHandled: number;
    hiredCount: number;
    hireRatePercent: number;
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
    avgTimeToHireDays: number | null;
    sourceEffectiveness: SourceEffectiveness[];
    pipelineConversion: StageConversion[];
    recruiterPerformance: RecruiterPerformance[];
}