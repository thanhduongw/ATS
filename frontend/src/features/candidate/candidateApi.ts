import axiosClient from "../../services/axiosClient";
import type {
  CandidateResponse,
  CandidateCreateRequest,
  CandidateUpdateRequest,
} from "./types";

export * from "./applicationApi";

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

/** Candidate tự tạo/lấy hồ sơ của mình — gọi 1 lần trước khi apply (idempotent). */
export const ensureMyCandidateProfile = (data: { email: string; fullName: string }) =>
  axiosClient.post<CandidateResponse>("/candidate/candidates/me", data);