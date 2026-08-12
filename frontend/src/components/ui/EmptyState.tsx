import type { ReactNode } from "react";
import { Empty, Typography, Space } from "antd";

const { Text } = Typography;

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

/** Trạng thái rỗng dùng chung khi danh sách/dữ liệu chưa có gì. */
export default function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                    <Space orientation="vertical" size={4}>
                        <Text strong>{title}</Text>
                        {description && <Text type="secondary">{description}</Text>}
                    </Space>
                }
            />
            {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </div>
    );
}
