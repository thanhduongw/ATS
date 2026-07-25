export type RequisitionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type PostingStatus = "OPEN" | "PAUSED" | "CLOSED";

export interface JobRequisitionResponse {
    id: number;
    title: string;
    departmentId: number;
    jobTitleId: number;
    jobLevelId: number | null;
    quantity: number;
    budget: number | null;
    expectedSalaryMin: number | null;
    expectedSalaryMax: number | null;
    expectedStartDate: string | null; // "YYYY-MM-DD"
    description: string | null;
    requesterId: number;
    requesterName: string;
    approverId: number;
    approverName: string;
    status: RequisitionStatus;
    rejectReason: string | null;
    createdAt: string;
}

export interface JobRequisitionCreateRequest {
    title: string;
    departmentId: number;
    jobTitleId: number;
    jobLevelId?: number | null;
    quantity: number;
    budget?: number | null;
    expectedSalaryMin?: number | null;
    expectedSalaryMax?: number | null;
    expectedStartDate?: string | null;
    description?: string | null;
    approverId: number;
}

export type JobRequisitionUpdateRequest = JobRequisitionCreateRequest;

export interface JobRequisitionRejectRequest {
    reason: string;
}

export interface JobPostingResponse {
    id: number;
    requisitionId: number;
    title: string;
    employmentTypeId: number;
    workLocationId: number;
    pipelineId: number;
    description: string | null;
    requirements: string | null;
    benefits: string | null;
    status: PostingStatus;
    pipelineLocked: boolean;
    publishedAt: string | null;
    closedAt: string | null;
}

export interface JobPostingCreateRequest {
    requisitionId: number;
    title: string;
    employmentTypeId: number;
    workLocationId: number;
    pipelineId: number;
    description?: string | null;
    requirements?: string | null;
    benefits?: string | null;
}

export type JobPostingUpdateRequest = Omit<JobPostingCreateRequest, "requisitionId">;

export interface JobPostingStatusRequest {
    status: PostingStatus;
}

export interface ApiMessageResponse {
    message: string;
}