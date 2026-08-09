import axiosClient from "../../services/axiosClient";
import type { AuditLogResponse, AuditLogSearchParams } from "./types";

export const searchAuditLogs = (params: AuditLogSearchParams) =>
    axiosClient.get<AuditLogResponse[]>("/notification/audit-logs", { params });