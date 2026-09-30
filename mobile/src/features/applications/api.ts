import { apiClient } from "@/api/client";
import type { ApplicationCreateRequest, CandidateApplication } from "@/types/api";

/**
 * Ứng viên tự nộp: KHÔNG gửi `candidateId` (backend suy từ JWT) và KHÔNG gửi `resumeUrl`
 * (backend lấy CV trong hồ sơ; chưa có CV → 400). `recruitmentSourceId` là BẮT BUỘC.
 */
export type ApplyRequest = Pick<ApplicationCreateRequest, "jobPostingId" | "recruitmentSourceId" | "note">;

export const applicationsApi = {
  apply: (body: ApplyRequest) =>
    apiClient.post<CandidateApplication>("/application/applications", body).then((r) => r.data),

  myList: () =>
    apiClient.get<CandidateApplication[]>("/application/applications/my").then((r) => r.data),

  myDetail: (id: number) =>
    apiClient.get<CandidateApplication>(`/application/applications/my/${id}`).then((r) => r.data),
};
