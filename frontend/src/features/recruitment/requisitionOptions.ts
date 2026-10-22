import type { RequisitionPriority, RequisitionReason, WorkArrangement } from "./types";

export const WORK_ARRANGEMENT_OPTIONS: { value: WorkArrangement; label: string }[] = [
    { value: "ONSITE", label: "On-site" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "REMOTE", label: "Remote" },
];

export const REASON_OPTIONS: { value: RequisitionReason; label: string }[] = [
    { value: "NEW", label: "Tuyển mới" },
    { value: "REPLACEMENT", label: "Thay thế" },
    { value: "EXPANSION", label: "Mở rộng đội ngũ" },
    { value: "NEW_PROJECT", label: "Dự án mới" },
    { value: "OTHER", label: "Khác" },
];

export const PRIORITY_OPTIONS: { value: RequisitionPriority; label: string }[] = [
    { value: "NORMAL", label: "Bình thường" },
    { value: "HIGH", label: "Cao" },
    { value: "URGENT", label: "Khẩn cấp" },
];

export const WORK_ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
    ONSITE: "On-site",
    HYBRID: "Hybrid",
    REMOTE: "Remote",
};

export const REASON_LABEL: Record<RequisitionReason, string> = {
    NEW: "Tuyển mới",
    REPLACEMENT: "Thay thế",
    EXPANSION: "Mở rộng đội ngũ",
    NEW_PROJECT: "Dự án mới",
    OTHER: "Khác",
};

export const PRIORITY_LABEL: Record<RequisitionPriority, string> = {
    NORMAL: "Bình thường",
    HIGH: "Cao",
    URGENT: "Khẩn cấp",
};

// [GIẢI THÍCH] Dòng nhắc dưới ô chọn kỹ năng (form tin tuyển dụng và phiếu yêu cầu tuyển dụng): AI chấm điểm coi mọi kỹ năng
// chọn ở đây là yêu cầu BẮT BUỘC; kỹ năng ưu tiên phải ghi trong phần Yêu cầu kèm chữ "Ưu tiên".
export const SKILL_REQUIRED_HINT =
    "Chỉ chọn kỹ năng BẮT BUỘC — AI coi mọi kỹ năng chọn ở đây là yêu cầu bắt buộc. "
    + "Kỹ năng ưu tiên hãy ghi trong phần Yêu cầu với chữ 'Ưu tiên'.";
