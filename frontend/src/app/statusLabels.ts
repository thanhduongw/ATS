export type StatusMeta = { label: string; color: string };

export const REQUISITION_STATUS: Record<string, StatusMeta> = {
    DRAFT: { label: "Nháp", color: "default" },
    PENDING_APPROVAL: { label: "Chờ duyệt", color: "warning" },
    APPROVED: { label: "Đã duyệt", color: "success" },
    REJECTED: { label: "Từ chối", color: "error" },
    CLOSED: { label: "Đã đóng", color: "default" },
};

export const POSTING_STATUS: Record<string, StatusMeta> = {
    DRAFT: { label: "Bản nháp", color: "default" },
    EDITING: { label: "Đang chỉnh sửa", color: "blue" },
    APPROVED: { label: "Đã duyệt", color: "cyan" },
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

/**
 * Buổi phỏng vấn — nguồn nhãn duy nhất cho toàn hệ thống.
 *
 * Ngoài nhãn và màu Tag, mỗi trạng thái còn mang bộ màu khối lịch (accent/bg/border)
 * để lịch phỏng vấn và lưới giờ không phải tự khai báo lại.
 */
export type InterviewStatusMeta = StatusMeta & {
    /** Màu nhấn — viền trái khối lịch, chấm trạng thái */
    accent: string;
    /** Nền khối lịch */
    bg: string;
    /** Viền khối lịch */
    border: string;
};

/** Nhãn nội bộ (HR / phòng ban) — nói rõ đang chờ ai. */
export const INTERVIEW_STATUS: Record<string, InterviewStatusMeta> = {
    SCHEDULED: {
        label: "Chờ phòng ban xác nhận", color: "warning",
        accent: "#D97706", bg: "#FFFBEB", border: "#FDE68A",
    },
    HM_RESCHEDULE_PROPOSED: {
        label: "Phòng ban đề xuất đổi giờ", color: "orange",
        accent: "#EA580C", bg: "#FFF7ED", border: "#FED7AA",
    },
    HM_CONFIRMED: {
        label: "Chờ ứng viên xác nhận", color: "processing",
        accent: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE",
    },
    CANDIDATE_CONFIRMED: {
        label: "Ứng viên đã xác nhận", color: "success",
        accent: "#0E7A5F", bg: "#F0FDF4", border: "#A7F3D0",
    },
    EVALUATION_PENDING: {
        label: "Chờ đánh giá", color: "purple",
        accent: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE",
    },
    COMPLETED: {
        label: "Hoàn thành", color: "default",
        accent: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB",
    },
    NO_SHOW: {
        label: "Vắng mặt", color: "gold",
        accent: "#B45309", bg: "#FEF3C7", border: "#FCD34D",
    },
    CANCELLED: {
        label: "Đã hủy", color: "error",
        accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
    },
};

/**
 * Nhãn rút gọn ở cổng ứng viên — cùng dữ liệu, khác cách diễn đạt.
 *
 * SCHEDULED và HM_RESCHEDULE_PROPOSED không có ở đây vì backend không trả về cho ứng viên;
 * hai mục đó chỉ là lưới an toàn phòng khi API đổi. EVALUATION_PENDING hiện thành
 * "Đã diễn ra" để không lộ chuyện nội bộ đang chờ ai chấm điểm.
 */
const INTERVIEW_STATUS_FOR_CANDIDATE: Record<string, string> = {
    SCHEDULED: "Đang sắp xếp",
    HM_RESCHEDULE_PROPOSED: "Đang sắp xếp",
    HM_CONFIRMED: "Chờ bạn xác nhận",
    CANDIDATE_CONFIRMED: "Đã xác nhận",
    EVALUATION_PENDING: "Đã diễn ra",
    COMPLETED: "Đã hoàn thành",
    NO_SHOW: "Vắng mặt",
    CANCELLED: "Đã hủy",
};

/** Thứ tự hiển thị trong chú giải và bộ lọc — theo đúng dòng chảy nghiệp vụ. */
export const INTERVIEW_STATUS_ORDER = [
    "SCHEDULED",
    "HM_RESCHEDULE_PROPOSED",
    "HM_CONFIRMED",
    "CANDIDATE_CONFIRMED",
    "EVALUATION_PENDING",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
] as const;

const INTERVIEW_STATUS_FALLBACK: InterviewStatusMeta = {
    label: "—", color: "default",
    accent: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB",
};

/**
 * Nhãn buổi phỏng vấn theo ngữ cảnh người xem.
 *
 * @param audience "internal" cho HR/phòng ban, "candidate" cho cổng ứng viên.
 */
export function interviewStatusMeta(
    status?: string | null,
    audience: "internal" | "candidate" = "internal",
): InterviewStatusMeta {
    if (!status) return INTERVIEW_STATUS_FALLBACK;
    const meta = INTERVIEW_STATUS[status];
    if (!meta) return { ...INTERVIEW_STATUS_FALLBACK, label: status };
    if (audience === "candidate") {
        return { ...meta, label: INTERVIEW_STATUS_FOR_CANDIDATE[status] ?? meta.label };
    }
    return meta;
}

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
    OFFER_CREATED: "Tạo đề nghị nhận việc",
    OFFER_SUBMITTED: "Gửi duyệt đề nghị",
    OFFER_APPROVED: "Duyệt đề nghị",
    OFFER_REJECTED: "Từ chối duyệt đề nghị",
    OFFER_ACCEPTED: "Ứng viên nhận đề nghị",
    OFFER_DECLINED: "Ứng viên từ chối đề nghị",
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
    OFFER: "Đề nghị nhận việc",
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
    OFFER: "Đề nghị nhận việc",
    HIRED: "Đã tuyển",
    REJECTED: "Từ chối",
    CUSTOM: "Tùy chỉnh",
};

export const GENDER_LABEL: Record<string, string> = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
};

/**
 * Giới tính lưu dưới dạng chuỗi tự do nên có thể gặp giá trị ngoài danh sách hoặc khác hoa
 * thường; khi đó trả lại đúng giá trị gốc thay vì để trống.
 */
export function genderLabel(gender?: string | null): string {
    if (!gender) return "";
    return GENDER_LABEL[gender.trim().toUpperCase()] ?? gender;
}

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