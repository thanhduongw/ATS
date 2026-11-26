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
                ? `/recruitment/requisitions?highlightId=${id}`
                : "/recruitment/requisitions";

        case "APPLICATION":
            if (isCandidate) {
                return id != null
                    ? `/my-applications/${id}`
                    : "/my-applications";
            }
            return id != null
                ? `/applications?highlightId=${id}`
                : "/applications";

        case "INTERVIEW":
            if (isCandidate) {
                return id != null
                    ? `/my-interviews?highlightId=${id}`
                    : "/my-interviews";
            }
            return id != null
                ? `/interviews?highlightId=${id}`
                : "/interviews";

        case "OFFER":
            if (isCandidate) {
                return id != null ? `/my-offers/${id}` : "/my-offers";
            }
            if (isHr || isDept) {
                return id != null ? `/offers?highlightId=${id}` : "/offers";
            }
            return null;

        default: {
            const t = String(n.type ?? "");
            if (t.includes("OFFER")) {
                if (isCandidate) return id != null ? `/my-offers/${id}` : "/my-offers";
                if (isHr || isDept) {
                    return id != null ? `/offers?highlightId=${id}` : "/offers";
                }
            }
            if (t.includes("INTERVIEW")) {
                if (isCandidate) {
                    return id != null
                        ? `/my-interviews?highlightId=${id}`
                        : "/my-interviews";
                }
                return id != null
                    ? `/interviews?highlightId=${id}`
                    : "/interviews";
            }
            if (t.includes("APPLICATION")) {
                return isCandidate ? "/my-applications" : "/applications";
            }
            if (t.includes("REQUISITION")) {
                return "/recruitment/requisitions";
            }
            return "/notifications";
        }
    }
}

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
    REQUISITION_PENDING_APPROVAL: "Yêu cầu tuyển dụng",
    REQUISITION_REVIEWED: "Kết quả duyệt yêu cầu",
    APPLICATION_CREATED: "Hồ sơ mới",
    APPLICATION_RECEIVED: "Đã nhận hồ sơ",
    APPLICATION_STAGE_CHANGED: "Cập nhật hồ sơ",
    APPLICATION_REJECTED: "Kết quả hồ sơ",
    INTERVIEW_SCHEDULED: "Lịch phỏng vấn",
    INTERVIEW_HM_CONFIRMED: "Lịch phỏng vấn đã được chốt",
    INTERVIEW_CONFIRMED: "Xác nhận phỏng vấn",
    INTERVIEW_CANDIDATE_DECLINED: "Ứng viên xin dời lịch",
    INTERVIEW_CANCELLED: "Lịch phỏng vấn đã huỷ",
    INTERVIEW_REMINDER: "Nhắc phỏng vấn",
    EVALUATION_INCOMPLETE_REMINDER: "Chưa đánh giá",
    OFFER_PENDING_CONFIRMATION: "Thư mời đã duyệt",
    OFFER_READY_FOR_CANDIDATE: "Thư mời nhận việc",
    OFFER_ACCEPTED: "Thư mời được nhận",
    OFFER_DECLINED: "Thư mời bị từ chối",
    APPLICATION_COMMENT_MENTION: "Nhắc đến bạn",
    APPLICATION_STALE_REMINDER: "Hồ sơ chưa xử lý",
};

/** Tên loại email trong màn Mẫu email — mô tả rõ ai nhận, khi nào. */
export const EMAIL_TYPE_LABEL: Record<string, string> = {
    REQUISITION_PENDING_APPROVAL: "Có yêu cầu tuyển dụng chờ duyệt (gửi HR)",
    REQUISITION_REVIEWED: "Kết quả duyệt yêu cầu (gửi phòng ban)",
    APPLICATION_CREATED: "Có hồ sơ ứng tuyển mới (gửi HR)",
    APPLICATION_RECEIVED: "Đã nhận hồ sơ (gửi ứng viên)",
    APPLICATION_STAGE_CHANGED: "Hồ sơ chuyển giai đoạn (gửi ứng viên)",
    APPLICATION_REJECTED: "Kết quả hồ sơ — từ chối (gửi ứng viên)",
    INTERVIEW_SCHEDULED: "Có lịch phỏng vấn mới",
    INTERVIEW_HM_CONFIRMED: "Phòng ban đã chốt giờ phỏng vấn",
    INTERVIEW_CONFIRMED: "Ứng viên xác nhận tham dự",
    INTERVIEW_CANDIDATE_DECLINED: "Ứng viên xin dời lịch (gửi HR)",
    INTERVIEW_CANCELLED: "Lịch phỏng vấn bị huỷ",
    INTERVIEW_REMINDER: "Nhắc lịch phỏng vấn sắp diễn ra",
    EVALUATION_INCOMPLETE_REMINDER: "Nhắc nộp đánh giá phỏng vấn",
    OFFER_PENDING_CONFIRMATION: "Thư mời chờ xác nhận",
    OFFER_READY_FOR_CANDIDATE: "Thư mời nhận việc (gửi ứng viên)",
    OFFER_ACCEPTED: "Ứng viên nhận việc (gửi HR)",
    OFFER_DECLINED: "Ứng viên từ chối thư mời (gửi HR)",
    APPLICATION_COMMENT_MENTION: "Được nhắc trong bình luận",
    APPLICATION_STALE_REMINDER: "Nhắc hồ sơ tồn đọng",
};
