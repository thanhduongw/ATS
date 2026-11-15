import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Pagination, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAllAsRead, markAsRead } from "../notificationApi";
import type { NotificationResponse } from "../types";
import { resolveNotificationPath } from "../notificationRoutes";
import { NotificationIcon } from "../components/NotificationIcon";
import { useAppSelector } from "../../../app/hooks";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import ListPage, { StatusTabs } from "../../../components/ui/listKit";
import EmptyState from "../../../components/ui/EmptyState";
import { useFitPageSize } from "../../../components/ui/useFitPageSize";

/**
 * C19 · Thông báo (dùng chung mọi vai trò): tab Tất cả · Chưa đọc, "Đánh dấu tất cả đã đọc",
 * mỗi dòng có ô icon theo loại, nền nhạt khi chưa đọc, nút hành động dẫn thẳng tới việc cần làm (Xem thư mời, Xem lịch…).
 * Ứng viên: 20 thông báo/trang, trang cuộn tự nhiên; vai trò nội bộ: phân trang vừa 1 màn hình.
 */
type Tab = "ALL" | "UNREAD";

/** Nhãn nút hành động theo loại đối tượng của thông báo. */
function actionLabel(n: NotificationResponse, role?: UserRole): string | null {
    const t = (n.resourceType ?? n.type ?? "").toUpperCase();
    const candidate = role === "CANDIDATE";
    if (t.includes("OFFER")) return "Xem thư mời";
    if (t.includes("INTERVIEW")) return candidate ? "Xem lịch" : "Xem lịch phỏng vấn";
    if (t.includes("APPLICATION")) return candidate ? "Xem đơn" : "Xem hồ sơ";
    if (t.includes("REQUISITION")) return "Xem yêu cầu";
    return null;
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const [items, setItems] = useState<NotificationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<Tab>("ALL");
    const [page, setPage] = useState(1);
    const listRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await getNotifications();
            setItems(res.data ?? []);
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const open = async (n: NotificationResponse) => {
        if (!n.read) await markAsRead(n.id).catch(() => undefined);
        const path = resolveNotificationPath(n, role);
        if (path && path !== "/notifications") navigate(path);
        else void load();
    };

    const unread = items.filter((n) => !n.read).length;
    const rows = tab === "UNREAD" ? items.filter((n) => !n.read) : items;
    // Phân trang vừa 1 màn hình (04/11/2026) — không cuộn danh sách dài.
    const fitSize = useFitPageSize(listRef, { itemSelector: "[data-row]", fallbackItem: 70, deps: [rows.length, page, tab] });
    const pageSize = role === "CANDIDATE" ? 20 : fitSize;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.min(page, pages);
    const shown = rows.slice((current - 1) * pageSize, current * pageSize);

    return (
        <ListPage
            title="Thông báo"
            actions={unread > 0 ? (
                <Button onClick={async () => { await markAllAsRead().catch(() => undefined); void load(); }}>
                    Đánh dấu tất cả đã đọc
                </Button>
            ) : undefined}
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={(t) => { setTab(t); setPage(1); }}
                    items={[
                        { key: "ALL", label: "Tất cả" },
                        { key: "UNREAD", label: "Chưa đọc", count: failed ? undefined : unread },
                    ]}
                />
            }
        >
            {loading ? (
                <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
            ) : failed ? (
                <EmptyState title="Không tải được thông báo" description="Kiểm tra kết nối mạng rồi thử lại."
                    action={<Button type="primary" onClick={() => { setLoading(true); void load(); }}>Thử lại</Button>} />
            ) : rows.length === 0 ? (
                <EmptyState title={tab === "UNREAD" ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo"} />
            ) : (
                <div ref={listRef} style={{ padding: "4px 0" }}>
                    {shown.map((n, i) => {
                        const label = actionLabel(n, role);
                        return (
                            <div
                                key={n.id}
                                data-row
                                className="row-clickable"
                                onClick={() => void open(n)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer",
                                    borderTop: i ? `0.5px solid ${COLORS.border}` : undefined,
                                    background: n.read ? undefined : COLORS.primarySoft,
                                }}
                            >
                                <NotificationIcon n={n} />
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{ fontWeight: n.read ? 500 : 600 }}>{n.title}</span>
                                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{n.message}</span>
                                </div>
                                {label && (
                                    <Button size="small" style={{ background: n.read ? COLORS.primarySoft : COLORS.cardBg, border: 0, color: COLORS.primary }}
                                        onClick={(e) => { e.stopPropagation(); void open(n); }}>
                                        {label}
                                    </Button>
                                )}
                                <span style={{ width: 90, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{relativeTime(n.createdAt)}</span>
                                    <span aria-label={n.read ? undefined : "Chưa đọc"} style={{
                                        width: 8, height: 8, borderRadius: 4, background: n.read ? "transparent" : COLORS.primary,
                                    }} />
                                </span>
                            </div>
                        );
                    })}
                    {rows.length > pageSize && (
                        <Pagination size="small" align="end" style={{ padding: "12px 20px" }} current={current} pageSize={pageSize}
                            total={rows.length} showSizeChanger={false} onChange={setPage}
                            showTotal={(t, [from, to]) => `${from}–${to} / ${t}`} />
                    )}
                </div>
            )}
        </ListPage>
    );
}
