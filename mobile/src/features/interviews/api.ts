import { apiClient } from "@/api/client";
import type { CandidateInterview, InterviewSlot } from "@/types/api";

export const interviewsApi = {
  /** CHỈ dành cho CANDIDATE. Backend đã lọc: chỉ trả buổi từ HM_CONFIRMED trở đi. */
  myList: () =>
    apiClient.get<CandidateInterview[]>("/interview/interviews/my").then((r) => r.data),

  /** Ứng viên xác nhận tham gia (HM_CONFIRMED → CANDIDATE_CONFIRMED). */
  confirm: (id: number) => apiClient.patch(`/interview/interviews/${id}/confirm`).then((r) => r.data),

  /** Khung giờ HR đề xuất mà ứng viên chưa báo rảnh. */
  myPendingSlots: () =>
    apiClient.get<InterviewSlot[]>("/interview/slots/my-pending").then((r) => r.data),

  /**
   * Ứng viên báo "rảnh giờ này". Chốt giờ là việc của HR (`/slots/{id}/select` chỉ HR gọi
   * được), nên phía ứng viên chỉ đánh dấu có thể tham gia.
   */
  markSlotAvailable: (slotId: number) =>
    apiClient
      .post<InterviewSlot>(`/interview/slots/${slotId}/confirm`, { available: true })
      .then((r) => r.data),
};
