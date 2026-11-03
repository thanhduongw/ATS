import type { FixedStage } from "../../app/theme";
import { toFixedStage } from "../../app/stages";
import type { PipelineStageResponse } from "../masterdata/types";
import { advanceApplicationStage } from "./applicationApi";

/**
 * Chuyển hồ sơ sang giai đoạn cố định kế tiếp (DS06: Ứng tuyển → Sàng lọc → Phỏng vấn → Thư mời → Đã tuyển).
 *
 * Quy trình mặc định cho tin mới có 6 bước, mỗi giai đoạn một bước (quyết định Q8 = b), nên chỉ cần
 * một lần "chuyển tiếp". Tin cũ còn quy trình 9 bước (2 bước Sàng lọc, 3 bước Phỏng vấn): khi đó gọi
 * "chuyển tiếp" nhiều lần cho tới bước ĐẦU của giai đoạn kế (dự phòng (a) của Q8) — backend chỉ cho
 * chuyển sang bước kế tiếp (ApplicationService.advanceStage).
 */

/** Các bước cần đi để tới bước đầu của giai đoạn cố định kế tiếp; null nếu không còn giai đoạn kế. */
export function planNextFixedStage(
    stages: PipelineStageResponse[],
    currentStageId: number | null | undefined,
): { steps: number; target: FixedStage; targetStage: PipelineStageResponse } | null {
    const sorted = [...stages]
        .filter((s) => s.stageType !== "REJECTED")
        .sort((a, b) => a.stageOrder - b.stageOrder);
    const idx = sorted.findIndex((s) => s.id === currentStageId);
    if (idx < 0) return null;
    const currentGroup = toFixedStage(sorted[idx].stageType);
    for (let j = idx + 1; j < sorted.length; j += 1) {
        const g = toFixedStage(sorted[j].stageType);
        if (g !== currentGroup) return { steps: j - idx, target: g, targetStage: sorted[j] };
    }
    return null;
}

/**
 * Số bước tới bước đầu của một giai đoạn cố định đích (dùng khi kéo thả trên kanban).
 * Chỉ cho đi tới giai đoạn KẾ TIẾP — giữ luật cũ "chỉ chuyển sang giai đoạn kế tiếp".
 */
export function stepsToFixedStage(
    stages: PipelineStageResponse[],
    currentStageId: number | null | undefined,
    dest: FixedStage,
): number | null {
    const plan = planNextFixedStage(stages, currentStageId);
    return plan && plan.target === dest ? plan.steps : null;
}

/** Gọi "chuyển tiếp" `steps` lần liên tiếp. Dừng và ném lỗi ngay khi một lần thất bại. */
export async function advanceSteps(applicationId: number, steps: number, note?: string): Promise<void> {
    for (let i = 0; i < steps; i += 1) {
        await advanceApplicationStage(applicationId, { note: note ?? null });
    }
}
