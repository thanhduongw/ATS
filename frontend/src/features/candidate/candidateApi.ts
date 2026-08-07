import axiosClient from "../../services/axiosClient";
import type {
  CandidateResponse,
  CandidateCreateRequest,
  CandidateUpdateRequest,
  ApplicationResponse,
  ApplicationCreateRequest,
  ApplicationAdvanceStageRequest,
  ApplicationRejectRequest,
  ApplicationHistoryResponse,
} from "./types";

// ===== Candidate =====
export const getCandidates = () => axiosClient.get<CandidateResponse[]>("/candidate/candidates");

export const getCandidateById = (id: number) =>
  axiosClient.get<CandidateResponse>(`/candidate/candidates/${id}`);

export const createCandidate = (data: CandidateCreateRequest) =>
  axiosClient.post<CandidateResponse>("/candidate/candidates", data);

export const updateCandidate = (id: number, data: CandidateUpdateRequest) =>
  axiosClient.put<CandidateResponse>(`/candidate/candidates/${id}`, data);

export const uploadCandidateCv = (id: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post<CandidateResponse>(`/candidate/candidates/${id}/cv`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===== Application =====
export const getApplications = (params?: { jobPostingId?: number; candidateId?: number }) =>
  axiosClient.get<ApplicationResponse[]>("/candidate/applications", { params });

export const getApplicationById = (id: number) =>
  axiosClient.get<ApplicationResponse>(`/candidate/applications/${id}`);

export const getApplicationHistory = (id: number) =>
  axiosClient.get<ApplicationHistoryResponse[]>(`/candidate/applications/${id}/history`);

export const createApplication = (data: ApplicationCreateRequest) =>
  axiosClient.post<ApplicationResponse>("/candidate/applications", data);

export const advanceApplicationStage = (id: number, data: ApplicationAdvanceStageRequest) =>
  axiosClient.patch<ApplicationResponse>(`/candidate/applications/${id}/advance-stage`, data);

export const rejectApplication = (id: number, data: ApplicationRejectRequest) =>
  axiosClient.patch<ApplicationResponse>(`/candidate/applications/${id}/reject`, data);
