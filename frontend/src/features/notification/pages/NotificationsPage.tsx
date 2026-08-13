import { useCallback, useEffect, useState } from "react";
import { Card, List, Button, Tag, Typography, Empty, Space } from "antd";
import { useNavigate } from "react-router-dom";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
} from "../notificationApi";
import type { NotificationResponse } from "../types";
import {
    NOTIFICATION_TYPE_LABEL,
    resolveNotificationPath,
} from "../notificationRoutes";
import { useAppSelector } from "../../../app/hooks";
import type { UserRole } from "../../auth/types";

const { Text, Title } = Typography;

export default function NotificationsPage() {
    const navigate = useNavigate();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const [items, setItems] = useState<NotificationResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getNotifications();
            setItems(res.data ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="page-container">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <Title level={4} style={{ margin: 0 }}>
                    Tất cả thông báo
                </Title>
                <Button
                    onClick={async () => {
                        await markAllAsRead();
                        load();
                    }}
                >
                    Đánh dấu tất cả đã đọc
                </Button>
            </div>
            <Card>
                <List
                    loading={loading}
                    dataSource={items}
                    locale={{ emptyText: <Empty description="Chưa có thông báo" /> }}
                    renderItem={(item) => (
                        <List.Item
                            style={{
                                background: item.read ? undefined : "#F0F7FF",
                                padding: "12px 16px",
                                cursor: "pointer",
                            }}
                            onClick={async () => {
                                if (!item.read) await markAsRead(item.id);
                                const path = resolveNotificationPath(item, role);
                                if (path) navigate(path);
                                else load();
                            }}
                        >
                            <List.Item.Meta
                                title={
                                    <Space>
                                        <Text strong={!item.read}>
                                            {item.title}
                                        </Text>
                                        <Tag>
                                            {NOTIFICATION_TYPE_LABEL[item.type] ?? item.type}
                                        </Tag>
                                    </Space>
                                }
                                description={
                                    <>
                                        <div>{item.message}</div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {new Date(item.createdAt).toLocaleString("vi-VN")}
                                        </Text>
                                    </>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}