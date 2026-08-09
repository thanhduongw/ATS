import axiosClient from "../../services/axiosClient";
import type { DashboardSummaryResponse } from "./types";

export const getDashboardSummary = () =>
    axiosClient.get<DashboardSummaryResponse>("/dashboard/summary");