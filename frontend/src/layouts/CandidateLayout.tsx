import type { ReactNode } from "react";
import { Layout } from "antd";
import { AppstoreOutlined, CalendarOutlined, FileTextOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { COLORS, RADIUS } from "../app/theme";
import { useAppSelector } from "../app/hooks";
import { Avatar } from "../components/ui/designKit";
import { awaitingReply, needsConfirm, useCandidatePortal } from "../features/candidate/useCandidatePortal";
import SiteHeader from "./SiteHeader";
import { SITE_HEADER_HEIGHT } from "./siteBrand";

const { Content } = Layout;

interface Item {
    to: string;
    label: string;
    icon: ReactNode;
    /** Số việc cần ứng viên phản hồi (đỏ). */
    badge?: number;
}

/**
 * Khung khu ứng viên (C20 và các trang C11–C19) — KHÁC khung nội bộ của admin/HR/phòng ban:
 * header website (Trang chủ · Việc làm, chuông, menu tài khoản) + thẻ menu trái + nội dung căn giữa, cuộn tự nhiên.
 * Menu gọn 5 mục (quyết định 13/11/2026): Thông báo mở từ chuông; Quyền riêng tư, Đăng xuất ở menu tài khoản.
 */
export default function CandidateLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const user = useAppSelector((s) => s.auth.user);
    // Số trên menu đổi sau khi ứng viên trả lời lịch / thư mời → tải lại mỗi lần đổi trang.
    const { interviews, offers } = useCandidatePortal(pathname);

    const items: Item[] = [
        { to: "/my-home", label: "Tổng quan", icon: <AppstoreOutlined /> },
        { to: "/my-applications", label: "Đơn ứng tuyển", icon: <FileTextOutlined /> },
        { to: "/my-interviews", label: "Lịch phỏng vấn", icon: <CalendarOutlined />, badge: interviews.filter(needsConfirm).length },
        { to: "/my-offers", label: "Thư mời nhận việc", icon: <MailOutlined />, badge: offers.filter(awaitingReply).length },
        { to: "/my-profile", label: "Hồ sơ của tôi", icon: <UserOutlined /> },
    ];
    const activeOf = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

    return (
        <Layout style={{ minHeight: "100vh", background: COLORS.body }}>
            <SiteHeader />
            <Content>
                <div className="candidate-shell">
                    <aside
                        className="candidate-side"
                        style={{
                            position: "sticky", top: SITE_HEADER_HEIGHT + 28, background: COLORS.cardBg, borderRadius: RADIUS.lg,
                            padding: 16, display: "flex", flexDirection: "column", gap: 4,
                        }}
                    >
                        <div className="candidate-side-who" style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 12px" }}>
                            <Avatar name={user?.fullName || user?.email} colorKey={user?.userId} size={44} src={user?.avatarUrl} />
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {user?.fullName || "Ứng viên"}
                                </span>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {user?.email}
                                </span>
                            </div>
                        </div>
                        <nav className="candidate-side-nav" aria-label="Khu ứng viên" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {items.map((it) => {
                                const active = activeOf(it.to);
                                return (
                                    <button
                                        key={it.to}
                                        type="button"
                                        onClick={() => navigate(it.to)}
                                        aria-current={active ? "page" : undefined}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12, height: 44, padding: "0 12px",
                                            border: 0, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: 15,
                                            textAlign: "left", background: active ? COLORS.primarySoft : "transparent",
                                            color: active ? COLORS.primary : COLORS.textPrimary, fontWeight: active ? 600 : 500,
                                        }}
                                    >
                                        <span style={{ fontSize: 16, color: active ? COLORS.primary : COLORS.textSecondary, display: "inline-flex" }}>{it.icon}</span>
                                        <span style={{ flex: 1 }}>{it.label}</span>
                                        {it.badge ? (
                                            <span
                                                aria-label={`${it.badge} việc cần phản hồi`}
                                                style={{
                                                    minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: COLORS.error,
                                                    color: COLORS.textOnDark, fontSize: 12, fontWeight: 600,
                                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                }}
                                            >
                                                {it.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>
                    <main style={{ minWidth: 0 }}>
                        <Outlet />
                    </main>
                </div>
            </Content>
        </Layout>
    );
}
