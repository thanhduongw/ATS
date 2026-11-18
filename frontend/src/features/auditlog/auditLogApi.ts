import axiosClient from "../../services/axiosClient";
import type { AuditLogResponse, AuditLogSearchParams } from "./types";

export const searchAuditLogs = (params: AuditLogSearchParams) =>
    axiosClient.get<AuditLogResponse[]>("/notification/audit-logs", { params });

/** Lịch sử của một vài đối tượng cùng loại (mọi vai trò nội bộ). Không kèm tên người thực hiện. */
export const getResourceHistory = (resourceType: string, resourceIds: number[]) =>
    axiosClient.get<AuditLogResponse[]>("/notification/audit-logs/resource", {
        params: { resourceType, resourceIds: resourceIds.join(",") },
    });