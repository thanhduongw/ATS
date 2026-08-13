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
  createdAt: string;
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
}

export type CandidateUpdateRequest = CandidateCreateRequest;

export interface ApplicationResponse {
  id: number;
  candidateId: number;
  candidateName: string;
  jobPostingId: number;
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

export interface ApiMessageResponse {
  message: string;
}
