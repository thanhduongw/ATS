export type RequisitionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type PostingStatus = "DRAFT" | "EDITING" | "APPROVED" | "OPEN" | "PAUSED" | "CLOSED";
export type WorkArrangement = "ONSITE" | "HYBRID" | "REMOTE";
export type RequisitionReason = "NEW" | "REPLACEMENT" | "EXPANSION" | "NEW_PROJECT" | "OTHER";
export type RequisitionPriority = "NORMAL" | "HIGH" | "URGENT";

export interface PageResponse<T> {
    content: T[];
    totalItems: number;
    totalPages: number;
    pageNumber: number;
    pageSize: number;
}

export interface JobRequisitionResponse {
    id: number;
    title: string;
    departmentId: number;
    jobTitleId: number;
    jobLevelId: number | null;
    quantity: number;
    employmentTypeId: number | null;
    workLocationId: number | null;
    workArrangement: WorkArrangement | null;
    experienceRequired: string | null;
    reason: RequisitionReason | null;
    priority: RequisitionPriority | null;
    note: string | null;
    budget: number | null;
    expectedSalaryMin: number | null;
    expectedSalaryMax: number | null;
    approvedSalaryMin: number | null;
    approvedSalaryMax: number | null;
    expectedStartDate: string | null; // "YYYY-MM-DD"
    description: string | null;
    requirements: string | null;
    benefits: string | null;
    skillIds: number[];
    requesterId: number;
    requesterName: string;
    approverId: number;
    approverName: string;
    status: RequisitionStatus;
    rejectReason: string | null;
    hrNote: string | null;
    createdAt: string;
}

export interface JobRequisitionCreateRequest {
    title: string;
    departmentId: number;
    jobTitleId: number;
    jobLevelId?: number | null;
    quantity: number;
    employmentTypeId?: number | null;
    workLocationId?: number | null;
    workArrangement?: WorkArrangement | null;
    experienceRequired?: string | null;
    reason?: RequisitionReason | null;
    priority?: RequisitionPriority | null;
    note?: string | null;
    budget?: number | null;
    expectedSalaryMin?: number | null;
    expectedSalaryMax?: number | null;
    expectedStartDate?: string | null;
    description?: string | null;
    requirements?: string | null;
    benefits?: string | null;
    skillIds?: number[];
    approverId: number;
}

export type JobRequisitionUpdateRequest = JobRequisitionCreateRequest;

export interface JobRequisitionRejectRequest {
    reason: string;
}

export interface JobRequisitionApproveRequest {
    approvedSalaryMin?: number | null;
    approvedSalaryMax?: number | null;
    note?: string | null;
}

export interface JobRequisitionRequestChangesRequest {
    note: string;
}

export interface JobPostingResponse {
    id: number;
    requisitionId: number;
    title: string;
    employmentTypeId: number;
    workLocationId: number;
    workArrangement: WorkArrangement | null;
    experienceRequired: string | null;
    pipelineId: number;
    salaryMin: number | null;
    salaryMax: number | null;
    description: string | null;
    requirements: string | null;
    benefits: string | null;
    skillIds: number[];
    status: PostingStatus;
    pipelineLocked: boolean;
    createdAt: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    approvedBy: number | null;
    approvedByName: string | null;
    publishedAt: string | null;
    closedAt: string | null;
    /** Chỉ populate ở luồng public (career portal); null ở luồng nội bộ HR. */
    employmentTypeName?: string | null;
    workLocationName?: string | null;
    departmentId?: number | null;
    departmentName?: string | null;
}

export interface PostingStatsResponse {
    jobPostingId: number;
    totalApplications: number;
    interviewingCount: number;
    offerCount: number;
    hiredCount: number;
    byStage: Record<string, number>;
    latestInterviewStatusByApplicationId: Record<number, string | null>;
}

export interface JobPostingCreateRequest {
    requisitionId: number;
    title: string;
    employmentTypeId: number;
    workLocationId: number;
    workArrangement?: WorkArrangement | null;
    experienceRequired?: string | null;
    pipelineId: number;
    salaryMin?: number | null;
    salaryMax?: number | null;
    description?: string | null;
    requirements?: string | null;
    benefits?: string | null;
    skillIds?: number[];
}

export type JobPostingUpdateRequest = Omit<JobPostingCreateRequest, "requisitionId">;

export interface JobPostingStatusRequest {
    status: PostingStatus;
}

export interface ApiMessageResponse {
    message: string;
}