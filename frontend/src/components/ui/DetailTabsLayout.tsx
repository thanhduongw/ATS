import type { ReactNode } from "react";
import { Tabs, Card, Space, Typography } from "antd";

const { Title, Text } = Typography;

interface DetailTabsLayoutProps {
    title: string;
    subtitle?: string;
    avatar?: ReactNode;
    extra?: ReactNode;
    items: { key: string; label: ReactNode; children: ReactNode }[];
    activeKey?: string;
    onChange?: (key: string) => void;
}

/**
 * Layout trang chi tiết dạng Tab (Overview/Resume/Scorecard/Messages/...) —
 * theo đúng mẫu trang chi tiết ứng viên trong video tham khảo (mục 4.5 kế hoạch).
 */
export default function DetailTabsLayout({
    title,
    subtitle,
    avatar,
    extra,
    items,
    activeKey,
    onChange,
}: DetailTabsLayoutProps) {
    return (
        <Card variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
                <Space size={12}>
                    {avatar}
                    <Space direction="vertical" size={0}>
                        <Title level={4} style={{ margin: 0 }}>{title}</Title>
                        {subtitle && <Text type="secondary">{subtitle}</Text>}
                    </Space>
                </Space>
                {extra}
            </div>
            <Tabs items={items} activeKey={activeKey} onChange={onChange} />
        </Card>
    );
}
