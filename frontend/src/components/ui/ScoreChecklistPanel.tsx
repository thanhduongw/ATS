import { Card, Space, Typography } from "antd";

const { Text } = Typography;

export interface ScoreChecklistItem {
    label: string;
    status: "done" | "warning" | "missing";
}

const DOT_COLOR: Record<ScoreChecklistItem["status"], string> = {
    done: "#22C55E",
    warning: "#F59E0B",
    missing: "#DC2626",
};

interface ScoreChecklistPanelProps {
    title?: string;
    items: ScoreChecklistItem[];
}

/**
 * Panel checklist realtime bên cạnh các form dài (Job Posting, Job Requisition) —
 * theo mẫu "Job Posting Score" trong video tham khảo (mục 4.3 kế hoạch).
 */
export default function ScoreChecklistPanel({ title = "Điểm hoàn thiện", items }: ScoreChecklistPanelProps) {
    return (
        <Card title={title} variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                {items.map((item) => (
                    <Space key={item.label} size={10}>
                        <span
                            style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: DOT_COLOR[item.status],
                                flexShrink: 0,
                            }}
                        />
                        <Text>{item.label}</Text>
                    </Space>
                ))}
            </Space>
        </Card>
    );
}
