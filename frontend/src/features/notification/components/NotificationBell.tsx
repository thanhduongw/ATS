import { useCallback, useEffect, useState } from "react";
import {
    Badge,
    Dropdown,
    Button,
    Empty,
    Typography,
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
    resolveNotificationPath,
} from "../notificationRoutes";
import type { UserRole } from "../../auth/types";
import { COLORS, SHADOWS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import { NotificationIcon } from "./NotificationIcon";
import { ensureFreshAccessToken } from "../../../services/axiosClient";

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
        let cancelled = false;

        ensureFreshAccessToken()
            .then((freshToken) => {
                if (cancelled || !freshToken) return;
                connectNotificationSocket(freshToken, (payload) => {
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
            })
            .catch(() => {
                // axiosClient sẽ điều hướng đăng nhập nếu refresh token không còn hợp lệ.
            });

        return () => {
            cancelled = true;
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

    // C27: tiêu đề + "Đánh dấu đã đọc", mỗi dòng có ô icon theo loại, nền nhạt khi chưa đọc, "Xem tất cả" ở cuối.
    const dropdownRender = () => (
        <div style={{ width: 380, maxWidth: "92vw", background: COLORS.cardBg, borderRadius: 20, boxShadow: SHADOWS.dropdown, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 10px" }}>
                <Text strong style={{ fontSize: 16 }}>Thông báo</Text>
                <Button type="link" size="small" disabled={unreadCount === 0} style={{ padding: 0 }}
                    onClick={(e) => { e.stopPropagation(); void handleMarkAllAsRead(); }}>
                    Đánh dấu đã đọc
                </Button>
            </div>
            {notifications.length === 0 ? (
                <Empty description={loading ? "Đang tải..." : "Không có thông báo"} style={{ padding: 32 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
                <div style={{ maxHeight: 420, overflowY: "auto", padding: "0 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {notifications.slice(0, 8).map((item) => (
                        <div
                            key={item.id}
                            className="row-clickable"
                            onClick={() => void handleClickItem(item)}
                            style={{
                                display: "flex", alignItems: "center", gap: 12, padding: "10px", borderRadius: 14, cursor: "pointer",
                                background: item.read ? undefined : COLORS.primaryFaint,
                            }}
                        >
                            <NotificationIcon n={item} size={36} />
                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 14, fontWeight: item.read ? 500 : 600, color: item.read ? COLORS.textSecondary : COLORS.textPrimary }}>
                                    {item.title}
                                </span>
                                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{relativeTime(item.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ padding: "8px 16px 14px", textAlign: "center" }}>
                <Button type="link" onClick={handleViewAll} style={{ padding: 0 }}>Xem tất cả</Button>
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
                        color: COLORS.textPrimary,
                    }}
                />
            </Badge>
        </Dropdown>
    );
}
