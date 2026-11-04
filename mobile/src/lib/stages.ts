import type { StatusTone } from "@/theme";
import type { PipelineStage } from "@/types/api";
import { STRINGS } from "@/lib/strings";

/**
 * 6 giai đoạn cố định của giao diện (DS01, DS06; quyết định B1) — cùng quy ước với web
 * `frontend/src/app/stages.ts`. Backend vẫn giữ pipeline cấu hình được, giao diện chỉ hiện 6 nhóm.
 */
export type FixedStage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";

/** Thứ tự đi tới (không có Từ chối). */
export const MAIN_STAGES: readonly FixedStage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];

const BY_TYPE: Record<string, FixedStage> = {
  APPLIED: "APPLIED",
  CV_SCREENING: "SCREENING",
  HR_SCREENING: "SCREENING",
  TECHNICAL_INTERVIEW: "INTERVIEW",
  HR_INTERVIEW: "INTERVIEW",
  FINAL_INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
};

/** stageType gốc → 1 trong 6 nhóm. CUSTOM và giá trị lạ xếp vào Sàng lọc (T1.4). */
export function toFixedStage(stageType?: string | null): FixedStage {
  if (!stageType) return "APPLIED";
  const g = BY_TYPE[stageType];
  if (g) return g;
  if (stageType.includes("INTERVIEW")) return "INTERVIEW";
  return "SCREENING";
}

/** DS06: Ứng tuyển xám · Sàng lọc xanh lá · Phỏng vấn tím · Thư mời cam · Đã tuyển xanh dương · Từ chối đỏ. */
const TONE: Record<FixedStage, StatusTone> = {
  APPLIED: "neutral",
  SCREENING: "success",
  INTERVIEW: "interview",
  OFFER: "warning",
  HIRED: "brand",
  REJECTED: "danger",
};

export const fixedStageView = (stageType?: string | null) => {
  const g = toFixedStage(stageType);
  return { label: STRINGS.staff.stage[g], tone: TONE[g] };
};

/**
 * Kế hoạch đi tới bước ĐẦU của giai đoạn cố định kế tiếp. Backend chỉ cho "chuyển tiếp" từng bước
 * (ApplicationService.advanceStage), quy trình cũ 9 bước cần gọi nhiều lần — giống web
 * `features/candidate/stageAdvance.ts`.
 */
export function planNextFixedStage(
  stages: readonly PipelineStage[],
  currentStageId?: number | null,
): { steps: number; target: FixedStage } | null {
  const sorted = stages
    .filter((s) => s.stageType !== "REJECTED")
    .slice()
    .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));
  const idx = sorted.findIndex((s) => s.id === currentStageId);
  const here = sorted[idx];
  if (!here) return null;
  const current = toFixedStage(here.stageType);
  for (let j = idx + 1; j < sorted.length; j += 1) {
    const g = toFixedStage(sorted[j]?.stageType);
    if (g !== current) return { steps: j - idx, target: g };
  }
  return null;
}
