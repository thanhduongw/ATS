import type { StatusTone } from "../../app/theme";

/** Quy tên preset màu cũ của antd (success, processing, purple…) về sắc độ DS06. */
const PRESET_TO_TONE: Record<string, StatusTone> = {
    default: "neutral",
    success: "success",
    green: "success",
    lime: "success",
    processing: "brand",
    blue: "brand",
    geekblue: "brand",
    cyan: "brand",
    warning: "warning",
    orange: "warning",
    gold: "warning",
    yellow: "warning",
    volcano: "warning",
    error: "danger",
    red: "danger",
    magenta: "danger",
    purple: "interview",
};

export function toneOf(color?: string): StatusTone {
    if (!color) return "neutral";
    return PRESET_TO_TONE[color] ?? "neutral";
}

