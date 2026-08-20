import { Tag, Tooltip } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useI18n } from "../i18n/useI18n";

/** Placeholder cho module AI duyệt CV (giai đoạn sau). */
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