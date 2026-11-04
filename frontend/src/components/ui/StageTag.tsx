import { STAGE_COLORS } from "../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../app/stages";

/**
 * Thẻ giai đoạn của hồ sơ — luôn hiển thị 1 trong 6 giai đoạn cố định (DS01, DS06),
 * cùng màu với thanh tiến trình, phễu và biểu đồ.
 */
export default function StageTag({ stageType }: { stageType?: string | null }) {
    const stage = toFixedStage(stageType);
    const c = STAGE_COLORS[stage];
    return (
        <span
            style={{
                display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 10px",
                borderRadius: 13, background: c.bg, color: c.text, fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", lineHeight: 1,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: c.text, flexShrink: 0 }} />
            {FIXED_STAGE_LABEL[stage]}
        </span>
    );
}
