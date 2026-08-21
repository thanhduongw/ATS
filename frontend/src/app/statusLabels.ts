export type StatusMeta = { label: string; color: string };

export const REQUISITION_STATUS: Record<string, StatusMeta> = {
    DRAFT: { label: "Nháp", color: "default" },
    PENDING_APPROVAL: { label: "Chờ duyệt", color: "warning" },
    APPROVED: { label: "Đã duyệt", color: "success" },
    REJECTED: { label: "Từ chối", color: "error" },
    CLOSED: { label: "Đã đóng", color: "default" },
};

export const POSTING_STATUS: Record<string, StatusMeta> = {
    DRAFT: { label: "Nháp", color: "default" },
    OPEN: { label: "Đang mở", color: "success" },
    PAUSED: { label: "Tạm dừng", color: "warning" },
    CLOSED: { label: "Đã đóng", color: "default" },
};

export const OFFER_STATUS: Record<string, StatusMeta> = {
    DRAFT: { label: "Bản nháp", color: "default" },
    PENDING_APPROVAL: { label: "Chờ duyệt", color: "warning" },
    APPROVED: { label: "Đã gửi ứng viên", color: "processing" },
    REJECTED: { label: "Từ chối duyệt", color: "error" },
    ACCEPTED: { label: "Ứng viên nhận", color: "success" },
    DECLINED: { label: "Ứng viên từ chối", color: "magenta" },
};

export const INTERVIEW_STATUS: Record<string, StatusMeta> = {
    SCHEDULED: { label: "Đã lên lịch", color: "processing" },
    CONFIRMED: { label: "Đã xác nhận", color: "success" },
    COMPLETED: { label: "Hoàn thành", color: "default" },
    CANCELLED: { label: "Đã hủy", color: "error" },
    NO_SHOW: { label: "Vắng mặt", color: "warning" },
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
    APPLICATION_STAGE_CHANGED: "Đổi giai đoạn hồ sơ",
    APPLICATION_REJECTED: "Từ chối hồ sơ",
    APPLICATION_CREATED: "Tạo hồ sơ ứng tuyển",
    REQUISITION_SUBMITTED: "Gửi yêu cầu tuyển dụng",
    REQUISITION_APPROVED: "Duyệt yêu cầu",
    REQUISITION_REJECTED: "Từ chối yêu cầu",
    POSTING_CREATED: "Tạo tin tuyển dụng",
    POSTING_STATUS_CHANGED: "Đổi trạng thái tin",
    INTERVIEW_SCHEDULED: "Lên lịch phỏng vấn",
    INTERVIEW_CONFIRMED: "Xác nhận lịch PV",
    INTERVIEW_CANCELLED: "Hủy lịch PV",
    EVALUATION_SUBMITTED: "Nộp đánh giá PV",
    OFFER_CREATED: "Tạo offer",
    OFFER_SUBMITTED: "Gửi duyệt offer",
    OFFER_APPROVED: "Duyệt offer",
    OFFER_REJECTED: "Từ chối duyệt offer",
    OFFER_ACCEPTED: "Ứng viên nhận offer",
    OFFER_DECLINED: "Ứng viên từ chối offer",
};

export const AUDIT_ACTION_COLOR: Record<string, string> = {
    APPLICATION_REJECTED: "error",
    REQUISITION_REJECTED: "error",
    OFFER_REJECTED: "error",
    OFFER_DECLINED: "magenta",
    INTERVIEW_CANCELLED: "error",
    REQUISITION_APPROVED: "success",
    OFFER_APPROVED: "success",
    OFFER_ACCEPTED: "success",
    INTERVIEW_CONFIRMED: "success",
    EVALUATION_SUBMITTED: "processing",
    APPLICATION_STAGE_CHANGED: "blue",
    POSTING_CREATED: "blue",
    INTERVIEW_SCHEDULED: "purple",
};

export const RESOURCE_TYPE_LABEL: Record<string, string> = {
    REQUISITION: "Yêu cầu tuyển dụng",
    JOB_POSTING: "Tin tuyển dụng",
    APPLICATION: "Hồ sơ ứng tuyển",
    INTERVIEW: "Phỏng vấn",
    OFFER: "Offer",
    CANDIDATE: "Ứng viên",
    USER: "Người dùng",
};

export const STAGE_TYPE_LABEL: Record<string, string> = {
    APPLIED: "Mới ứng tuyển",
    CV_SCREENING: "Sàng lọc CV",
    HR_SCREENING: "Sàng lọc HR",
    TECHNICAL_INTERVIEW: "Phỏng vấn kỹ thuật",
    HR_INTERVIEW: "Phỏng vấn HR",
    FINAL_INTERVIEW: "Phỏng vấn vòng cuối",
    OFFER: "Đề nghị offer",
    HIRED: "Đã tuyển",
    REJECTED: "Từ chối",
    CUSTOM: "Tùy chỉnh",
};

export function statusMeta(
    map: Record<string, StatusMeta>,
    status?: string | null
): StatusMeta {
    if (!status) return { label: "—", color: "default" };
    return map[status] ?? { label: status, color: "default" };
}

/** Màu Antd Tag theo stageType của pipeline (APPLIED, CV_SCREENING, ...). */
export function stageTypeTagColor(stageType?: string | null): string {
    if (!stageType) return "default";
    if (stageType === "HIRED") return "success";
    if (stageType === "REJECTED") return "error";
    if (stageType === "OFFER") return "gold";
    if (stageType.includes("INTERVIEW")) return "purple";
    if (stageType.includes("SCREENING")) return "processing";
    return "blue"; // APPLIED, CUSTOM
}