import { Tag, Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import type { AiScoreStatus, AiTier } from "../types";
import { aiTierMeta, isAiScoring } from "../aiScore";

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
    if (meta) {
        return (
            <Tooltip title={isAiScoring(status) ? "AI đang chấm lại hồ sơ này" : undefined}>
                <Tag color={meta.color} style={{ margin: 0, fontWeight: 600 }}>
                    {isAiScoring(status) && <LoadingOutlined style={{ marginRight: 4 }} />}
                    {score != null ? `${score} · ${meta.label}` : meta.label}
                </Tag>
            </Tooltip>
        );
    }
    if (isAiScoring(status)) {
        return (
            <Tag icon={<LoadingOutlined />} color="processing" style={{ margin: 0 }}>
                {status === "PENDING" ? "Chờ chấm" : "Đang chấm"}
            </Tag>
        );
    }
    if (status === "FAILED") {
        return (
            <Tooltip title="Mở hồ sơ để xem lỗi và chấm lại">
                <Tag style={{ margin: 0 }}>Chấm lỗi</Tag>
            </Tooltip>
        );
    }
    return <span style={{ color: "#9CA3AF" }}>—</span>;
}
