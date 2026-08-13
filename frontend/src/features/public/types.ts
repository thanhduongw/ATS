/** Khớp CompanyResponse backend (auth public) */
export interface PublicCompanyResponse {
    id: number;
    tenantId: number;
    name: string;
    tenantCode: string;
}

/** Khớp JobPostingResponse backend */
export interface PublicJobPosting {
    id: number;
    requisitionId: number;
    title: string;
    employmentTypeId: number;
    workLocationId: number;
    pipelineId: number;
    salaryMin: number | null;
    salaryMax: number | null;
    description: string | null;
    requirements: string | null;
    benefits: string | null;
    status: "OPEN" | "PAUSED" | "CLOSED";
    pipelineLocked: boolean;
    publishedAt: string | null;
    closedAt: string | null;
}

/** Response sau khi nộp public apply */
export interface PublicApplyResponse {
    applicationId: number;
    candidateId: number;
    candidateName: string;
    candidateEmail: string;
    jobPostingId: number;
    currentStageName: string;
    appliedAt: string;
    message: string;
}

export interface ApiMessageResponse {
    message: string;
}