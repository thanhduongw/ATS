export interface CandidateResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  currentPosition: string | null;
  educationLevelId: number | null;
  educationLevelName: string | null;
  skillIds: number[];
  skillNames: string[];
  cvFileUrl: string | null;
  internalNote: string | null;
  poolStatus: "ACTIVE" | "IN_POOL";
  tags: CandidateTag[];
  customFields: Record<string, string>;
  createdAt: string;
}

export interface CandidateTag {
  id: number;
  tag: string;
}

export type CustomFieldType = "TEXT" | "NUMBER" | "DATE";

export interface CustomFieldDefinition {
  id: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  active: boolean;
}

export interface CustomFieldDefinitionRequest {
  fieldKey: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
}

export interface CandidateCreateRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  currentPosition?: string | null;
  educationLevelId?: number | null;
  skillIds?: number[] | null;
  internalNote?: string | null;
  customFields?: Record<string, string> | null;
}

export type CandidateUpdateRequest = CandidateCreateRequest;

export interface ApplicationResponse {
  id: number;
  candidateId: number;
  candidateName: string;
  jobPostingId: number;
  jobTitle?: string;
  jobPostingTitle?: string;
  recruitmentSourceId: number;
  recruitmentSourceName: string;
  assignedRecruiterId: number | null;
  assignedRecruiterName: string | null;
  resumeUrl: string;
  currentStageId: number;
  currentStageName: string;
  currentStageOrder: number;
  currentStageType: string;
  rejectionReasonId: number | null;
  rejectionReasonName: string | null;
  note: string | null;
  appliedAt: string;
}
export interface CandidateWithApplications extends CandidateResponse {
  applications: ApplicationResponse[];
}

export interface ApplicationCreateRequest {
  candidateId?: number | null;
  jobPostingId: number;
  recruitmentSourceId: number;
  assignedRecruiterId?: number | null;
  resumeUrl?: string | null;
  note?: string | null;
}

export interface ApplicationAdvanceStageRequest {
  note?: string | null;
}

export interface ApplicationRejectRequest {
  rejectionReasonId: number;
  note?: string | null;
}

export interface ApplicationHistoryResponse {
  id: number;
  fromStageName: string | null;
  toStageName: string;
  note: string | null;
  changedByUserId: number;
  changedByUserName: string;
  changedAt: string;
}

export interface ApplicationCommentResponse {
  id: number;
  content: string;
  authorUserId: number;
  authorUserName: string;
  createdAt: string;
}

export interface ApiMessageResponse {
  message: string;
}

export interface PageResponse<T> {
  content: T[];
  totalItems: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface BulkOperationResponse {
  succeededIds: number[];
  failedIds: Record<number, string>;
}
