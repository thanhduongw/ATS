import { Tag, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { AiClassification } from "../types";

interface Props {
  /** MATCH | REVIEW | NOT_MATCH or null */
  classification: AiClassification | null | undefined;
  /** Total score 0-100 */
  score?: number | null;
  /** True if AI is still processing */
  processing?: boolean;
  /** Show score text next to badge */
  showScore?: boolean;
  onClick?: () => void;
}

const CONFIG: Record<
  AiClassification,
  { color: string; icon: React.ReactNode; label: string; tooltip: string }
> = {
  MATCH: {
    color: "success",
    icon: <CheckCircleOutlined />,
    label: "Phù hợp",
    tooltip: "AI đánh giá: Ứng viên phù hợp (≥80 điểm)",
  },
  REVIEW: {
    color: "warning",
    icon: <ExclamationCircleOutlined />,
    label: "Cần xem xét",
    tooltip: "AI đánh giá: Cần xem xét thêm (50–79 điểm)",
  },
  NOT_MATCH: {
    color: "error",
    icon: <CloseCircleOutlined />,
    label: "Chưa phù hợp",
    tooltip: "AI đánh giá: Chưa phù hợp (<50 điểm)",
  },
};

/**
 * Compact badge showing AI classification result.
 * Used in Application list table and detail page header.
 */
export default function AIClassificationBadge({
  classification,
  score,
  processing,
  showScore = false,
  onClick,
}: Props) {
  if (processing) {
    return (
      <Tag
        icon={<LoadingOutlined spin />}
        color="purple"
        style={{
          borderRadius: 12,
          margin: 0,
          cursor: onClick ? "pointer" : "default",
          fontSize: 12,
        }}
        onClick={onClick}
      >
        Đang phân tích...
      </Tag>
    );
  }

  if (!classification) return null;

  const cfg = CONFIG[classification];
  if (!cfg) return null;

  const scoreText =
    showScore && score != null ? ` · ${Math.round(score)} điểm` : "";

  return (
    <Tooltip title={cfg.tooltip}>
      <Tag
        icon={cfg.icon}
        color={cfg.color}
        style={{
          borderRadius: 12,
          margin: 0,
          cursor: onClick ? "pointer" : "default",
          fontWeight: 500,
          fontSize: 12,
        }}
        onClick={onClick}
      >
        {cfg.label}
        {scoreText}
      </Tag>
    </Tooltip>
  );
}
