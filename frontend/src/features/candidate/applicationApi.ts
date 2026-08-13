import axiosClient from "../../services/axiosClient";
import type {
  ApplicationResponse,
  ApplicationCreateRequest,
  ApplicationAdvanceStageRequest,
  ApplicationRejectRequest,
  ApplicationHistoryResponse,
} from "./types";

// ===== Application =====
export const getApplications = (params?: { jobPostingId?: number; candidateId?: number }) =>
  axiosClient.get<ApplicationResponse[]>("/application/applications", { params });

export const getApplicationById = (id: number) =>
  axiosClient.get<ApplicationResponse>(`/application/applications/${id}`);

export const getApplicationHistory = (id: number) =>
  axiosClient.get<ApplicationHistoryResponse[]>(`/application/applications/${id}/history`);

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