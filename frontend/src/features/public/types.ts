/** Khớp CompanyResponse backend (auth public) */
export interface PublicCompanyResponse {
    id: number;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    dataRetentionMonths: number | null;
    /** C01 chân trang + mặc định trang tuyển dụng (A08). */
    tagline?: string | null;
    benefits?: string | null;
    address?: string | null;
    phone?: string | null;
    recruitingEmail?: string | null;
    website?: string | null;
    legalName?: string | null;
    brandColor?: string | null;
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
    employmentTypeName: string | null;
    workLocationName: string | null;
    headcount?: number | null;
    workArrangement?: "ONSITE" | "HYBRID" | "REMOTE" | null;
    experienceRequired?: string | null;
    departmentId?: number | null;
    departmentName?: string | null;
    applicationDeadline?: string | null;
    urgent?: boolean;
    showSalary?: boolean;
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
