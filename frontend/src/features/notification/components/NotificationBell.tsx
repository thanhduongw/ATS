import { useEffect, useState, useCallback } from "react";
import { Badge, Dropdown, List, Button, Empty, Typography } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../../app/hooks";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../notificationApi";
import { connectNotificationSocket, disconnectNotificationSocket } from "../websocketClient";
import type { NotificationResponse } from "../types";

const { Text } = Typography;

export default function NotificationBell() {
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    const loadInitial = useCallback(async () => {
        try {
            const [listRes, countRes] = await Promise.all([getNotifications(), getUnreadCount()]);
            setNotifications(listRes.data);
            setUnreadCount(countRes.data.count);
        } catch {
            // Không chặn luồng chính của trang nếu tải thông báo ban đầu thất bại
        }
    }, []);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    useEffect(() => {
        if (!accessToken) return;

        connectNotificationSocket(accessToken, (payload) => {
            const notification = payload as NotificationResponse;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            disconnectNotificationSocket();
        };
    }, [accessToken]);

    const handleMarkAsRead = async (id: number) => {
        await markAsRead(id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const dropdownRender = () => (
        <div style={{ width: 360, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderBottom: "1px solid #f0f0f0",
                }}
            >
                <Text strong>Thông báo</Text>
                <Button type="link" size="small" onClick={handleMarkAllAsRead}>
                    Đánh dấu tất cả đã đọc
                </Button>
            </div>
            {notifications.length === 0 ? (
                <Empty description="Không có thông báo" style={{ padding: 24 }} />
            ) : (
                <List
                    style={{ maxHeight: 400, overflowY: "auto" }}
                    dataSource={notifications}
                    renderItem={(item) => (
                        <List.Item
                            style={{
                                padding: "8px 16px",
                                background: item.read ? "#fff" : "#e6f4ff",
                                cursor: "pointer",
                            }}
                            onClick={() => !item.read && handleMarkAsRead(item.id)}
                        >
                            <List.Item.Meta
                                title={<Text strong={!item.read}>{item.title}</Text>}
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
            )}
        </div>
    );

    return (
        <Dropdown open={open} onOpenChange={setOpen} popupRender={dropdownRender} trigger={["click"]} placement="bottomRight">
            <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 20, cursor: "pointer" }} />
            </Badge>
        </Dropdown>
    );
}