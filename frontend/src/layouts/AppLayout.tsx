import { useState } from "react";
import { Avatar, Dropdown, Layout, Menu, Space, Typography, Breadcrumb, Button } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    DashboardOutlined, DatabaseOutlined, SolutionOutlined, TeamOutlined, AppstoreOutlined,
    CalendarOutlined, FileTextOutlined, AuditOutlined, LogoutOutlined, UserOutlined,
    ScheduleOutlined, GlobalOutlined, SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import NotificationBell from "../features/notification/components/NotificationBell";
import { COLORS } from "../app/theme";
import type { UserRole } from "../features/auth/types";
import { ROLE_LABELS } from "../app/roles";
import { useI18n } from "../i18n/I18nProvider";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

/* ── Breadcrumb mapping ─────────────────────────── */
const BREADCRUMB_MAP: Record<string, string> = {
    "/dashboard": "Tổng quan",
    "/masterdata": "Danh mục",
    "/recruitment": "Tuyển dụng",
    "/candidates": "Ứng viên",
    "/applications": "Hồ sơ ứng tuyển",
    "/scheduling": "Xếp lịch PV",
    "/interviews": "Phỏng vấn",
    "/offers": "Offer",
    "/audit-logs": "Nhật ký",
    "/settings": "Cài đặt",
};

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const { lang, setLang, t } = useI18n();
    const [collapsed, setCollapsed] = useState(false);

    const all = {
        dashboard: { key: "/dashboard", icon: <DashboardOutlined />, label: t("menu.dashboard") },
        masterdata: { key: "/masterdata", icon: <DatabaseOutlined />, label: t("menu.masterdata") },
        recruitment: { key: "/recruitment", icon: <SolutionOutlined />, label: t("menu.recruitment") },
        candidates: { key: "/candidates", icon: <TeamOutlined />, label: t("menu.candidates") },
        applications: { key: "/applications", icon: <AppstoreOutlined />, label: t("menu.applications") },
        myApplications: { key: "/my-applications", icon: <AppstoreOutlined />, label: lang === "vi" ? "Đơn của tôi" : "My Applications" },
        scheduling: { key: "/scheduling", icon: <ScheduleOutlined />, label: t("menu.scheduling") },
        interviews: { key: "/interviews", icon: <CalendarOutlined />, label: t("menu.interviews") },
        offers: { key: "/offers", icon: <FileTextOutlined />, label: t("menu.offers") },
        audit: { key: "/audit-logs", icon: <AuditOutlined />, label: t("menu.audit") },
        settings: { key: "/settings", icon: <SettingOutlined />, label: lang === "vi" ? "Cài đặt" : "Settings" },
    };

    const MENU_BY_ROLE: Record<UserRole, typeof all[keyof typeof all][]> = {
        PLATFORM_ADMIN: [all.dashboard, all.audit],
        COMPANY_ADMIN: [all.dashboard, all.masterdata, all.recruitment, all.candidates, all.applications, all.scheduling, all.interviews, all.offers, all.audit, all.settings],
        RECRUITER: [all.dashboard, all.masterdata, all.recruitment, all.candidates, all.applications, all.scheduling, all.interviews, all.offers, all.settings],
        HIRING_MANAGER: [all.dashboard, all.recruitment, all.scheduling, all.interviews, all.settings],
        INTERVIEWER: [all.dashboard, all.scheduling, all.interviews, all.settings],
        CANDIDATE: [all.myApplications, all.scheduling],
    };

    const menuItems = user ? MENU_BY_ROLE[user.role] : [];

    const handleLogout = () => { dispatch(logout()); navigate("/login"); };

    /* Get user initials for avatar */
    const getInitials = () => {
        if (!user) return "U";
        const name = user.fullName || user.email || "";
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    /* Build breadcrumb */
    const pathParts = location.pathname.split("/").filter(Boolean);
    const breadcrumbItems = [
        { title: "ATS" },
        ...pathParts.map((_, idx) => {
            const path = "/" + pathParts.slice(0, idx + 1).join("/");
            return { title: BREADCRUMB_MAP[path] || pathParts[idx] };
        }),
    ];

    return (
        /* ── Root: chiếm đúng 100vh, KHÔNG scroll toàn trang ── */
        <Layout style={{ height: "100vh", overflow: "hidden" }}>

            {/* ── Sidebar — cố định bên trái ─────────────────── */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                trigger={null}
                theme="light"
                width={240}
                collapsedWidth={64}
                style={{
                    height: "100vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "1px solid #E5E7EB",
                    boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 10,
                }}
            >
                {/* Logo — luôn cố định trên đầu sidebar */}
                <div className={`sidebar-logo${collapsed ? " sidebar-logo--collapsed" : ""}`}>
                    <div className="sidebar-logo-icon">A</div>
                    {!collapsed && <span className="sidebar-logo-text">ATS</span>}
                </div>

                {/* Navigation menu — khu vực có thể scroll riêng */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    <Menu
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        inlineCollapsed={collapsed}
                        style={{ borderInlineEnd: "none", padding: "8px 0" }}
                    />
                </div>

                {/* User info — luôn cố định ở đáy sidebar */}
                {user && !collapsed && (
                    <div className="sidebar-user" style={{ flexShrink: 0 }}>
                        <div className="sidebar-user-avatar">{getInitials()}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user.fullName || user.email}</div>
                            <div className="sidebar-user-role">{ROLE_LABELS[user.role][lang]}</div>
                        </div>
                    </div>
                )}
                {user && collapsed && (
                    <div style={{
                        padding: "12px 0",
                        display: "flex",
                        justifyContent: "center",
                        borderTop: "1px solid #F3F4F6",
                        flexShrink: 0,
                    }}>
                        <div className="sidebar-user-avatar" style={{ fontSize: 12 }}>{getInitials()}</div>
                    </div>
                )}
            </Sider>

            {/* ── Main Area — Header + Content cùng một cột ──── */}
            <Layout style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>

                {/* Header — cố định trên đầu, không scroll */}
                <Header
                    className="app-header"
                    style={{ flexShrink: 0, zIndex: 9 }}
                >
                    {/* Left: Toggle + Breadcrumb */}
                    <div className="app-header-left">
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 16,
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        />
                        <Breadcrumb
                            items={breadcrumbItems}
                            style={{ margin: 0 }}
                            separator={<span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>}
                        />
                    </div>

                    {/* Right: Lang + Bell + User */}
                    <div className="app-header-right">
                        <GlobalOutlined
                            style={{ color: COLORS.accent, cursor: "pointer", fontSize: 16 }}
                            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
                        />

                        <NotificationBell />

                        <Dropdown menu={{
                            items: [
                                {
                                    key: "profile",
                                    icon: <UserOutlined />,
                                    label: lang === "vi" ? "Cài đặt tài khoản" : "Account Settings",
                                    onClick: () => navigate("/settings"),
                                },
                                { type: "divider" },
                                {
                                    key: "logout",
                                    icon: <LogoutOutlined />,
                                    label: lang === "vi" ? "Đăng xuất" : "Logout",
                                    danger: true,
                                    onClick: handleLogout,
                                },
                            ]
                        }}>
                            <Space style={{ cursor: "pointer" }}>
                                <Avatar
                                    size={32}
                                    style={{
                                        background: "linear-gradient(135deg, #D9F99D 0%, #BEF264 100%)",
                                        color: COLORS.header,
                                        fontWeight: 700,
                                        fontSize: 13,
                                    }}
                                >
                                    {getInitials()}
                                </Avatar>
                                <Text style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
                                    {user?.fullName || user?.email || "User"}
                                </Text>
                            </Space>
                        </Dropdown>
                    </div>
                </Header>

                {/* Content — khu vực DUY NHẤT có scroll */}
                <Content
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        background: COLORS.body,
                        minHeight: 0, // Quan trọng: cho phép flex item co lại
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}