import { apiClient } from "@/api/client";
import type { JobPostingResponse } from "@/types/api";

export const jobsApi = {
  /**
   * Tin đang mở — endpoint CÔNG KHAI, KHÔNG có `keyword`, KHÔNG phân trang (trả mảng).
   * Tìm kiếm và lọc làm ở client trên mảng này.
   */
  listOpen: () =>
    apiClient.get<JobPostingResponse[]>("/recruitment/public/jobs").then((r) => r.data),

  detail: (id: number) =>
    apiClient.get<JobPostingResponse>(`/recruitment/public/jobs/${id}`).then((r) => r.data),
};
