import type { AiScoreStatus, AiTier } from "./types";

/** Ba mức xếp loại — khớp ngưỡng cấu hình ở ai-service (≥65 / 45–65 / <45). */
export const AI_TIER_META: Record<AiTier, { label: string; color: string; stroke: string }> = {
    GOOD_FIT: { label: "Phù hợp tốt", color: "green", stroke: "#22C55E" },
    POTENTIAL_FIT: { label: "Tiềm năng", color: "gold", stroke: "#F59E0B" },
    NOT_FIT: { label: "Chưa phù hợp", color: "red", stroke: "#DC2626" },
};

export const AI_TIER_OPTIONS = (Object.keys(AI_TIER_META) as AiTier[])
    .map((t) => ({ value: t, label: AI_TIER_META[t].label }));

export const isAiScoring = (status: AiScoreStatus | null | undefined) =>
    status === "PENDING" || status === "PROCESSING";
