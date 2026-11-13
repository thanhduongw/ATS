import { COLORS } from "../../../app/theme";
import { toFixedStage } from "../../../app/stages";
import type { CandidateApplicationResponse } from "../types";

const STEPS = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as const;

/**
 * Thanh tiến độ 5 đoạn dưới chip giai đoạn (C11, C20 "Đơn gần đây"): tô tới giai đoạn hiện tại —
 * xanh chính khi đang xử lý, xanh lá khi đã có thư mời / đã tuyển. Đơn đã đóng (chưa phù hợp, rút đơn) tô xám:
 * backend chỉ giữ giai đoạn hiện tại nên không biết đơn dừng ở bước nào.
 */
export default function StageProgress({ app, width = 104 }: { app: CandidateApplicationResponse; width?: number }) {
    const stage = toFixedStage(app.currentStageType);
    const closed = stage === "REJECTED";
    const reached = closed ? STEPS.length : STEPS.indexOf(stage as (typeof STEPS)[number]) + 1;
    const fill = closed ? COLORS.textMuted : stage === "OFFER" || stage === "HIRED" ? COLORS.success : COLORS.primary;
    return (
        <span
            role="img"
            aria-label={closed ? "Đơn đã đóng" : `Bước ${reached}/${STEPS.length}`}
            style={{ display: "inline-flex", gap: 4, width }}
        >
            {STEPS.map((s, i) => (
                <span
                    key={s}
                    style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: closed ? COLORS.fill : i < reached ? fill : COLORS.fill,
                    }}
                />
            ))}
        </span>
    );
}
