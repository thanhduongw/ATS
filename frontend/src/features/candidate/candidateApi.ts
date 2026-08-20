import axiosClient from "../../services/axiosClient";
import type {
  CandidateResponse,
  CandidateCreateRequest,
  CandidateUpdateRequest,
  PageResponse,
  BulkOperationResponse,
} from "./types";

export * from "./applicationApi";

// ===== Candidate =====
export const getCandidates = (params?: {
  keyword?: string;
  hasCv?: boolean;
  poolStatus?: "ACTIVE" | "IN_POOL";
  page?: number;
  size?: number;
}) => axiosClient.get<PageResponse<CandidateResponse>>("/candidate/candidates", { params });

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

/** Candidate tự tạo/lấy hồ sơ của mình — gọi 1 lần trước khi apply (idempotent). */
export const ensureMyCandidateProfile = (data: { email: string; fullName: string }) =>
  axiosClient.post<CandidateResponse>("/candidate/candidates/me", data);

export const bulkDeleteCandidates = (ids: number[]) =>
  axiosClient.post<BulkOperationResponse>("/candidate/candidates/bulk-delete", { ids });

// ===== Talent Pool tags =====
export const addCandidateTag = (id: number, tag: string) =>
  axiosClient.post<CandidateResponse>(`/candidate/candidates/${id}/tags`, { tag });

export const removeCandidateTag = (id: number, tagId: number) =>
  axiosClient.delete<CandidateResponse>(`/candidate/candidates/${id}/tags/${tagId}`);

// ===== GDPR self-service =====
export const requestOwnDataDeletion = () =>
  axiosClient.post<{ message: string }>("/candidate/candidates/me/request-deletion");