import axiosClient from "../../services/axiosClient";
import type { DashboardSummaryResponse } from "./types";
import type { PostingStatsResponse } from "../recruitment/types";

export const getDashboardSummary = (params?: { from?: string; to?: string }) =>
    axiosClient.get<DashboardSummaryResponse>("/dashboard/summary", { params });

export const getDashboardReportPdf = (params?: { from?: string; to?: string }) =>
    axiosClient.get<Blob>("/dashboard/report/pdf", { params, responseType: "blob" });

/** Thống kê ứng viên theo tin tuyển dụng — dùng cho Stat row + trạng thái PV gần nhất trên PostingHubPage. */
export const getPostingStats = (jobPostingId: number) =>
    axiosClient.get<PostingStatsResponse>(`/dashboard/postings/${jobPostingId}/stats`);