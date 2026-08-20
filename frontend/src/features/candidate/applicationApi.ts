import axiosClient from "../../services/axiosClient";
import type {
  ApplicationResponse,
  ApplicationCreateRequest,
  ApplicationAdvanceStageRequest,
  ApplicationRejectRequest,
  ApplicationHistoryResponse,
  ApplicationCommentResponse,
  PageResponse,
  BulkOperationResponse,
} from "./types";

// ===== Application =====
export const getApplications = (params?: {
  jobPostingId?: number;
  candidateId?: number;
  assignedRecruiterId?: number;
  recruitmentSourceId?: number;
  stageType?: string;
  appliedFrom?: string;
  appliedTo?: string;
  page?: number;
  size?: number;
}) => axiosClient.get<PageResponse<ApplicationResponse>>("/application/applications", { params });

export const getApplicationById = (id: number) =>
  axiosClient.get<ApplicationResponse>(`/application/applications/${id}`);

export const getApplicationHistory = (id: number) =>
  axiosClient.get<ApplicationHistoryResponse[]>(`/application/applications/${id}/history`);

export const getApplicationComments = (id: number) =>
  axiosClient.get<ApplicationCommentResponse[]>(`/application/applications/${id}/comments`);

export const addApplicationComment = (id: number, content: string) =>
  axiosClient.post<ApplicationCommentResponse>(`/application/applications/${id}/comments`, { content });

export const createApplication = (data: ApplicationCreateRequest) =>
  axiosClient.post<ApplicationResponse>("/application/applications", data);

/** Candidate self-apply — không gửi candidateId, server tự resolve theo user login. */
export const applyToJob = (data: {
  jobPostingId: number;
  recruitmentSourceId: number;
  resumeUrl?: string | null;
  note?: string | null;
}) => axiosClient.post<ApplicationResponse>("/application/applications", data);

export const advanceApplicationStage = (id: number, data: ApplicationAdvanceStageRequest) =>
  axiosClient.patch<ApplicationResponse>(`/application/applications/${id}/advance-stage`, data);

export const rejectApplication = (id: number, data: ApplicationRejectRequest) =>
  axiosClient.patch<ApplicationResponse>(`/application/applications/${id}/reject`, data);

export const assignApplicationRecruiter = (id: number, assignedRecruiterId: number) =>
  axiosClient.patch<ApplicationResponse>(`/application/applications/${id}/assign-recruiter`, { assignedRecruiterId });

export const bulkAdvanceApplicationStage = (ids: number[], note?: string) =>
  axiosClient.patch<BulkOperationResponse>("/application/applications/bulk-advance-stage", { ids, note });

export const bulkRejectApplications = (ids: number[], rejectionReasonId: number, note?: string) =>
  axiosClient.patch<BulkOperationResponse>("/application/applications/bulk-reject", { ids, rejectionReasonId, note });

export const bulkAssignApplicationRecruiter = (ids: number[], assignedRecruiterId: number) =>
  axiosClient.patch<BulkOperationResponse>("/application/applications/bulk-assign-recruiter", { ids, assignedRecruiterId });