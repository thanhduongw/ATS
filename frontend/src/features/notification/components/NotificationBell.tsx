import { useCallback, useEffect, useState } from "react";
import {
    Badge,
    Dropdown,
    List,
    Button,
    Empty,
    Typography,
    Tag,
    Space,
    App,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from "../notificationApi";
import {
    connectNotificationSocket,
    disconnectNotificationSocket,
} from "../websocketClient";
import type { NotificationResponse } from "../types";
import {
    NOTIFICATION_TYPE_LABEL,
    resolveNotificationPath,
} from "../notificationRoutes";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";

const { Text } = Typography;

export default function NotificationBell() {
    const navigate = useNavigate();
    const { message: antMessage } = App.useApp();
    const accessToken = useAppSelector((s) => s.auth.accessToken);
    const role = useAppSelector((s) => s.auth.user?.role) as
        | UserRole
        | undefined;

    const [notifications, setNotifications] = useState<NotificationResponse[]>(
        []
    );
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadInitial = useCallback(async () => {
        setLoading(true);
        try {
            const [listRes, countRes] = await Promise.all([
                getNotifications(),
                getUnreadCount(),
            ]);
            setNotifications(listRes.data ?? []);
            setUnreadCount(countRes.data?.count ?? 0);
        } catch {
            // Không chặn UI chính
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!accessToken) return;
        loadInitial();
    }, [accessToken, loadInitial]);

    useEffect(() => {
        if (!accessToken) return;

        connectNotificationSocket(accessToken, (payload) => {
            const n = payload as NotificationResponse;
            if (!n?.id) return;

            setNotifications((prev) => {
                if (prev.some((x) => x.id === n.id)) return prev;
                return [n, ...prev];
            });
            setUnreadCount((prev) => prev + 1);

            antMessage.info({
                content: n.title || "Thông báo mới",
                duration: 3,
            });
        });

        return () => {
            disconnectNotificationSocket();
        };
    }, [accessToken, antMessage]);

    const handleMarkAsRead = async (id: number) => {
        const target = notifications.find((n) => n.id === id);
        if (!target || target.read) return;
        try {
            await markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // ignore
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            antMessage.error("Không đánh dấu được tất cả đã đọc");
        }
    };

    const handleClickItem = async (item: NotificationResponse) => {
        if (!item.read) {
            await handleMarkAsRead(item.id);
        }
        const path = resolveNotificationPath(item, role);
        setOpen(false);
        if (path) {
            navigate(path);
        } else {
            navigate("/notifications");
        }
    };

    const handleViewAll = () => {
        setOpen(false);
        navigate("/notifications");
    };

    const dropdownRender = () => (
        <div
            style={{
                width: 380,
                maxWidth: "92vw",
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#FAFAFA",
                }}
            >
                <Space>
                    <Text strong>Thông báo</Text>
                    {unreadCount > 0 && (
                        <Tag color="blue" style={{ margin: 0 }}>
                            {unreadCount} mới
                        </Tag>
                    )}
                </Space>
                <Button
                    type="link"
                    size="small"
                    disabled={unreadCount === 0}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAllAsRead();
                    }}
                >
                    Đọc tất cả
                </Button>
            </div>

            {notifications.length === 0 ? (
                <Empty
                    description={loading ? "Đang tải..." : "Không có thông báo"}
                    style={{ padding: 32 }}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <List
                    style={{ maxHeight: 420, overflowY: "auto" }}
                    dataSource={notifications.slice(0, 50)}
                    renderItem={(item) => (
                        <List.Item
                            style={{
                                padding: "10px 16px",
                                margin: 0,
                                background: item.read ? "#fff" : "#F0F7FF",
                                cursor: "pointer",
                                borderBottom: "1px solid #F3F4F6",
                            }}
                            onClick={() => handleClickItem(item)}
                        >
                            <List.Item.Meta
                                title={
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 8,
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <Text strong={!item.read} style={{ fontSize: 13 }}>
                                            {item.title}
                                        </Text>
                                        {!item.read && (
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    background: COLORS.primary || "#3B82F6",
                                                    flexShrink: 0,
                                                    marginTop: 6,
                                                }}
                                            />
                                        )}
                                    </div>
                                }
                                description={
                                    <div>
                                        {item.type && (
                                            <Tag
                                                style={{ marginBottom: 4, fontSize: 11 }}
                                                color="default"
                                            >
                                                {NOTIFICATION_TYPE_LABEL[item.type] ?? item.type}
                                            </Tag>
                                        )}
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#4B5563",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {item.message}
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {item.createdAt
                                                ? new Date(item.createdAt).toLocaleString("vi-VN")
                                                : ""}
                                        </Text>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}

            <div
                style={{
                    borderTop: "1px solid #f0f0f0",
                    padding: "8px 16px",
                    textAlign: "center",
                    background: "#FAFAFA",
                }}
            >
                <Button type="link" onClick={handleViewAll} style={{ padding: 0 }}>
                    Xem tất cả thông báo
                </Button>
            </div>
        </div>
    );

    return (
        <Dropdown
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (v) loadInitial();
            }}
            popupRender={dropdownRender}
            trigger={["click"]}
            placement="bottomRight"
        >
            <Badge count={unreadCount} size="small" overflowCount={99}>
                <BellOutlined
                    style={{
                        fontSize: 18,
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.9)",
                    }}
                />
            </Badge>
        </Dropdown>
    );
}