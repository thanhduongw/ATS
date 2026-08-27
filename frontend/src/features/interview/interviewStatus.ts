import type { InterviewStatus } from "./types";

export interface InterviewStatusMeta {
    label: string;
    /** Màu cho antd Tag */
    tag: string;
    /** Màu nhấn — viền trái khối lịch, chấm trạng thái */
    accent: string;
    /** Nền khối lịch */
    bg: string;
    /** Viền khối lịch */
    border: string;
}

export const INTERVIEW_STATUS_META: Record<InterviewStatus, InterviewStatusMeta> = {
    SCHEDULED: {
        label: "Đã lên lịch",
        tag: "processing",
        accent: "#3B82F6",
        bg: "#EFF6FF",
        border: "#BFDBFE",
    },
    CONFIRMED: {
        label: "Ứng viên đã xác nhận",
        tag: "success",
        accent: "#0E7A5F",
        bg: "#F0FDF4",
        border: "#A7F3D0",
    },
    COMPLETED: {
        label: "Hoàn thành",
        tag: "default",
        accent: "#6B7280",
        bg: "#F9FAFB",
        border: "#E5E7EB",
    },
    CANCELLED: {
        label: "Đã hủy",
        tag: "error",
        accent: "#DC2626",
        bg: "#FEF2F2",
        border: "#FECACA",
    },
};

const FALLBACK: InterviewStatusMeta = {
    label: "—",
    tag: "default",
    accent: "#9CA3AF",
    bg: "#F9FAFB",
    border: "#E5E7EB",
};

export const interviewStatusMeta = (status?: string | null): InterviewStatusMeta =>
    (status && INTERVIEW_STATUS_META[status as InterviewStatus]) || FALLBACK;

export const INTERVIEW_STATUS_ORDER: InterviewStatus[] = [
    "SCHEDULED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
];
