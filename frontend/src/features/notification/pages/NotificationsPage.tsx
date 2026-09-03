import { useCallback, useEffect, useState } from "react";
import { Card, Button, Tag, Typography, Empty, Space, Spin } from "antd";
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
        <div className="page-shell">
            <div
                className="page-shell-fixed"
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
            <Card
                style={{ flex: 1, minHeight: 0 }}
                styles={{ body: { height: "100%", overflowY: "auto" } }}
            >
                {loading ? (
                    <div style={{ padding: 40, textAlign: "center" }}>
                        <Spin />
                    </div>
                ) : items.length === 0 ? (
                    <Empty description="Chưa có thông báo" />
                ) : (
                    <div>
                        {items.map((item) => (
                            <div
                                key={item.id}
                            style={{
                                background: item.read ? undefined : "#F0F7FF",
                                padding: "12px 16px",
                                cursor: "pointer",
                                borderBottom: "1px solid #F3F4F6",
                            }}
                            onClick={async () => {
                                if (!item.read) await markAsRead(item.id);
                                const path = resolveNotificationPath(item, role);
                                if (path) navigate(path);
                                else load();
                            }}
                        >
                                <Space>
                                    <Text strong={!item.read}>
                                        {item.title}
                                    </Text>
                                    <Tag>
                                        {NOTIFICATION_TYPE_LABEL[item.type] ?? item.type}
                                    </Tag>
                                </Space>
                                <div>{item.message}</div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                                </Text>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
