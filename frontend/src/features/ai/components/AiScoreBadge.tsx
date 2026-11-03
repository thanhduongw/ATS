import { Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import type { AiScoreStatus, AiTier } from "../types";
import { aiTierMeta, isAiScoring } from "../aiScore";
import { COLORS } from "../../../app/theme";
import StatusTag from "../../../components/ui/StatusTag";
import { AiScorePill } from "../../../components/ui/designKit";

interface Props {
    score: number | null;
    tier: AiTier | null;
    status: AiScoreStatus | null;
}

/** Điểm AI gọn cho bảng danh sách. Đang chấm lại thì vẫn hiện điểm cũ kèm biểu tượng chờ. */
// [GIẢI THÍCH] Huy hiệu điểm trong cột "Điểm AI" của bảng danh sách. 4 trường hợp:
// 1. Có xếp loại -> thẻ màu "75 · Phù hợp"; Chưa phân loại không tính được điểm (điểm null) -> chỉ nhãn
//    "Chưa phân loại". Đang chấm lại thì thêm biểu tượng xoay.
// 2. Chưa có điểm, đang chờ/đang chấm -> "Chờ chấm" / "Đang chấm".
// 3. FAILED -> "Chấm lỗi".   4. Chưa chấm lần nào -> "—".
export default function AiScoreBadge({ score, tier, status }: Props) {
    const meta = aiTierMeta(tier);
    const scoring = isAiScoring(status);
    if (meta) {
        return (
            <Tooltip title={scoring ? "AI đang chấm lại hồ sơ này" : undefined}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {score != null
                        ? <AiScorePill score={score} suffix={` ${meta.label.toLowerCase()}`} />
                        : <StatusTag color={meta.color} label={meta.label} />}
                    {scoring && <LoadingOutlined style={{ color: COLORS.textMuted }} />}
                </span>
            </Tooltip>
        );
    }
    if (scoring) {
        return (
            <StatusTag tone="brand" label={status === "PENDING" ? "Chờ chấm" : "Đang chấm"} />
        );
    }
    if (status === "FAILED") {
        return (
            <Tooltip title="Mở hồ sơ để xem lỗi và chấm lại">
                <span><StatusTag tone="neutral" label="Chấm lỗi" /></span>
            </Tooltip>
        );
    }
    return <span style={{ color: COLORS.textMuted }}>—</span>;
}
