import type { ReactNode } from "react";
import { Card, Typography, Space } from "antd";
import { COLORS } from "../../app/theme";

const { Text, Title } = Typography;

interface StatCardProps {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
    hint?: string;
    accentColor?: string;
}

/**
 * Thẻ số liệu (KPI card) — dùng cho Dashboard, Insights Overview.
 * Giống mẫu "Views / Applications / Candidates Hired" trong video tham khảo.
 */
export default function StatCard({ icon, label, value, hint, accentColor = COLORS.primary }: StatCardProps) {
    return (
        <Card variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }} styles={{ body: { padding: 20 } }}>
            <Space direction="vertical" size={8} style={{ width: "100%", alignItems: "center", textAlign: "center" }}>
                {icon && (
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: `${accentColor}1A`,
                            color: accentColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                        }}
                    >
                        {icon}
                    </div>
                )}
                <Text type="secondary">{label}</Text>
                <Title level={3} style={{ margin: 0 }}>
                    {value}
                </Title>
                {hint && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {hint}
                    </Text>
                )}
            </Space>
        </Card>
    );
}
