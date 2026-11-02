import { Tag, Tooltip } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n/useI18n";

/**
 * Huy hiệu AI dạng chung (chỉ có điểm, không có xếp loại). Điểm null -> chỉ hiện nhãn, không hiện số.
 * Màn danh sách hồ sơ dùng features/ai/components/AiScoreBadge (có xếp loại Phù hợp / Không phù hợp / Chưa phân loại).
 */
export default function AiScoreBadge({ score }: { score?: number | null }) {
    const { t } = useI18n();
    if (score == null) {
        return (
            <Tooltip title={t("ai.tooltip")}>
                <Tag icon={<RobotOutlined />} color="processing">AI · {t("common.comingSoon")}</Tag>
            </Tooltip>
        );
    }
    const color = score >= 70 ? "green" : score >= 40 ? "gold" : "red";
    return <Tag icon={<RobotOutlined />} color={color}>AI · {score}%</Tag>;
}