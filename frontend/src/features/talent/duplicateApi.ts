import axiosClient from "../../services/axiosClient";
import type { DuplicatePair, DuplicateStatus } from "./types";

/** Cặp ứng viên nghi trùng (mặc định chờ xử lý). Chỉ Admin / Recruiter. */
export const listDuplicates = (params?: { candidateId?: number; status?: DuplicateStatus }) =>
  axiosClient.get<{ total: number; items: DuplicatePair[] }>("/v1/ai/duplicates", { params, timeout: 30_000 });

/** "Không phải trùng": hệ thống không báo lại cặp này. */
export const dismissDuplicate = (id: number) =>
  axiosClient.post<{ id: number; status: DuplicateStatus }>(`/v1/ai/duplicates/${id}/dismiss`);

/** "Đúng là trùng": chỉ ghi nhận, KHÔNG tự gộp hồ sơ. */
export const confirmDuplicate = (id: number) =>
  axiosClient.post<{ id: number; status: DuplicateStatus }>(`/v1/ai/duplicates/${id}/confirm`);
