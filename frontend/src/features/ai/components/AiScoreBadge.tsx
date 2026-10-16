import { Tag, Tooltip } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import type { AiScoreStatus, AiTier } from "../types";
import { AI_TIER_META, isAiScoring } from "../aiScore";

interface Props {
    score: number | null;
    tier: AiTier | null;
    status: AiScoreStatus | null;
}

/** Điểm AI gọn cho bảng danh sách. Đang chấm lại thì vẫn hiện điểm cũ kèm biểu tượng chờ. */
export default function AiScoreBadge({ score, tier, status }: Props) {
    if (score != null && tier) {
        const meta = AI_TIER_META[tier];
        return (
            <Tooltip title={isAiScoring(status) ? "AI đang chấm lại hồ sơ này" : undefined}>
                <Tag color={meta.color} style={{ margin: 0, fontWeight: 600 }}>
                    {isAiScoring(status) && <LoadingOutlined style={{ marginRight: 4 }} />}
                    {score} · {meta.label}
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
