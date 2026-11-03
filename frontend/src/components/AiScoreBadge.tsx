import { Tooltip } from "antd";
import { useI18n } from "../i18n/useI18n";
import StatusTag from "./ui/StatusTag";
import { AiScorePill } from "./ui/designKit";

/**
 * Huy hiệu AI dạng chung (chỉ có điểm, không có xếp loại). Điểm null -> chỉ hiện nhãn, không hiện số.
 * Điểm AI luôn dùng dải màu AI (DS01, DS03).
 * Màn danh sách hồ sơ dùng features/ai/components/AiScoreBadge (có xếp loại Phù hợp / Không phù hợp / Chưa phân loại).
 */
export default function AiScoreBadge({ score }: { score?: number | null }) {
    const { t } = useI18n();
    if (score == null) {
        return (
            <Tooltip title={t("ai.tooltip")}>
                <span><StatusTag tone="neutral" label={`AI · ${t("common.comingSoon")}`} /></span>
            </Tooltip>
        );
    }
    return <AiScorePill score={score} />;
}
