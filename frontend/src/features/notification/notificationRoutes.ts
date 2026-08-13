import type { NotificationResponse } from "./types";
import type { UserRole } from "../auth/types";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../app/roles";

/**
 * Điều hướng khi click 1 notification theo resourceType + role.
 */
export function resolveNotificationPath(
    n: NotificationResponse,
    role?: UserRole
): string | null {
    const type = n.resourceType?.toUpperCase() ?? "";
    const id = n.resourceId;

    const isHr = role && HR_ROLES.includes(role);
    const isDept = role && DEPARTMENT_ROLES.includes(role);
    const isCandidate = role === "CANDIDATE";

    switch (type) {
        case "REQUISITION":
            return "/recruitment"; // tab Requisition
        case "APPLICATION":
            if (isCandidate) return "/my-applications";
            return "/applications";
        case "INTERVIEW":
            if (isCandidate) return "/scheduling";
            if (id != null) return `/interviews`;
            return "/interviews";
        case "OFFER":
            if (isCandidate && id != null) return `/offers/candidate/${id}`;
            if (isHr || isDept) return "/offers";
            return null;
        default:
            // Fallback theo notification type
            if (n.type?.includes("OFFER") && isCandidate && id != null) {
                return `/offers/candidate/${id}`;
            }
            if (n.type?.includes("INTERVIEW")) {
                return isCandidate ? "/scheduling" : "/interviews";
            }
            if (n.type?.includes("APPLICATION") && isCandidate) {
                return "/my-applications";
            }
            return null;
    }
}

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
    REQUISITION_PENDING_APPROVAL: "Yêu cầu tuyển dụng",
    APPLICATION_CREATED: "Hồ sơ mới",
    APPLICATION_STAGE_CHANGED: "Cập nhật hồ sơ",
    APPLICATION_REJECTED: "Kết quả hồ sơ",
    INTERVIEW_SCHEDULED: "Lịch phỏng vấn",
    INTERVIEW_CONFIRMED: "Xác nhận PV",
    INTERVIEW_REMINDER: "Nhắc phỏng vấn",
    EVALUATION_INCOMPLETE_REMINDER: "Chưa đánh giá",
    OFFER_PENDING_CONFIRMATION: "Offer đã duyệt",
    OFFER_READY_FOR_CANDIDATE: "Thư đề nghị",
    OFFER_ACCEPTED: "Offer được nhận",
    OFFER_DECLINED: "Offer bị từ chối",
};