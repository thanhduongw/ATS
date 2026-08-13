import type { NotificationResponse } from "./types";
import type { UserRole } from "../auth/types";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../app/roles";

/**
 * Deep-link khi click notification.
 * highlightId giúp list page mở drawer / focus đúng bản ghi.
 */
export function resolveNotificationPath(
    n: NotificationResponse,
    role?: UserRole
): string | null {
    const type = (n.resourceType ?? "").toUpperCase();
    const id = n.resourceId;
    const isHr = !!role && HR_ROLES.includes(role);
    const isDept = !!role && DEPARTMENT_ROLES.includes(role);
    const isCandidate = role === "CANDIDATE";

    switch (type) {
        case "REQUISITION":
            return id != null
                ? `/recruitment?tab=requisition&highlightId=${id}`
                : "/recruitment";

        case "APPLICATION":
            if (isCandidate) {
                return id != null
                    ? `/my-applications?highlightId=${id}`
                    : "/my-applications";
            }
            return id != null
                ? `/applications?highlightId=${id}`
                : "/applications";

        case "INTERVIEW":
            if (isCandidate) {
                return id != null
                    ? `/scheduling?highlightId=${id}`
                    : "/scheduling";
            }
            return id != null
                ? `/interviews?highlightId=${id}`
                : "/interviews";

        case "OFFER":
            if (isCandidate) {
                return id != null ? `/offers/candidate/${id}` : "/offers";
            }
            if (isHr || isDept) {
                return id != null ? `/offers?highlightId=${id}` : "/offers";
            }
            return null;

        default: {
            const t = String(n.type ?? "");
            if (t.includes("OFFER")) {
                if (isCandidate && id != null) return `/offers/candidate/${id}`;
                if (isHr || isDept) {
                    return id != null ? `/offers?highlightId=${id}` : "/offers";
                }
            }
            if (t.includes("INTERVIEW")) {
                if (isCandidate) {
                    return id != null
                        ? `/scheduling?highlightId=${id}`
                        : "/scheduling";
                }
                return id != null
                    ? `/interviews?highlightId=${id}`
                    : "/interviews";
            }
            if (t.includes("APPLICATION")) {
                return isCandidate ? "/my-applications" : "/applications";
            }
            if (t.includes("REQUISITION")) {
                return "/recruitment";
            }
            return "/notifications";
        }
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