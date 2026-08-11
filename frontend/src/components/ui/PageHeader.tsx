import type { ReactNode } from "react";
import { Typography, Space } from "antd";

const { Title, Text } = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    extra?: ReactNode;
}

/**
 * Tiêu đề trang chuẩn dùng chung toàn hệ thống — thay cho việc mỗi trang tự viết <h2>.
 * Ví dụ: <PageHeader title="Yêu cầu tuyển dụng" subtitle="Quản lý vòng đời yêu cầu tuyển dụng" extra={<Button ... />} />
 */
export default function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
            }}
        >
            <Space direction="vertical" size={2}>
                <Title level={3} style={{ margin: 0 }}>
                    {title}
                </Title>
                {subtitle && (
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        {subtitle}
                    </Text>
                )}
            </Space>
            {extra && <div>{extra}</div>}
        </div>
    );
}
