import { Tag } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { ConfidenceLevel } from "../types";

const CONFIG: Record<
  ConfidenceLevel,
  { color: string; icon: React.ReactNode; label: string }
> = {
  HIGH: {
    color: "success",
    icon: <CheckCircleOutlined />,
    label: "Độ tin cậy cao",
  },
  MEDIUM: {
    color: "warning",
    icon: <WarningOutlined />,
    label: "Nên kiểm tra",
  },
  LOW: {
    color: "error",
    icon: <ExclamationCircleOutlined />,
    label: "Cần kiểm tra",
  },
};

interface Props {
  level: ConfidenceLevel;
  style?: React.CSSProperties;
}

export default function FieldConfidenceBadge({ level, style }: Props) {
  const cfg = CONFIG[level];
  return (
    <Tag
      icon={cfg.icon}
      color={cfg.color}
      style={{ borderRadius: 6, margin: 0, ...style }}
    >
      {cfg.label}
    </Tag>
  );
}
