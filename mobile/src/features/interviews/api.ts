import { apiClient } from "@/api/client";
import type { CandidateInterview } from "@/types/api";

export const interviewsApi = {
  /** CHỈ dành cho CANDIDATE. Backend đã lọc: chỉ trả buổi từ HM_CONFIRMED trở đi. */
  myList: () =>
    apiClient.get<CandidateInterview[]>("/interview/interviews/my").then((r) => r.data),

  /** Ứng viên xác nhận tham gia (HM_CONFIRMED → CANDIDATE_CONFIRMED). */
  confirm: (id: number) => apiClient.patch(`/interview/interviews/${id}/confirm`).then((r) => r.data),

  /** Ứng viên xin dời lịch (lý do bắt buộc) — lịch 1 giờ cố định, ứng viên không tự đề xuất giờ. */
  decline: (id: number, reason: string) =>
    apiClient.patch(`/interview/interviews/${id}/candidate-decline`, { reason }).then((r) => r.data),
};
