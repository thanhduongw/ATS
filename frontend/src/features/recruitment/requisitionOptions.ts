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
