import axiosClient from "../../services/axiosClient";
import type { DashboardSummaryResponse } from "./types";

export const getDashboardSummary = (params?: { from?: string; to?: string }) =>
    axiosClient.get<DashboardSummaryResponse>("/dashboard/summary", { params });

export const getDashboardReportPdf = (params?: { from?: string; to?: string }) =>
    axiosClient.get<Blob>("/dashboard/report/pdf", { params, responseType: "blob" });