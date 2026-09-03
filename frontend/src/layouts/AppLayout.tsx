import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from "antd";
import {
    AppstoreOutlined, AuditOutlined, CalendarOutlined, DashboardOutlined,
    DatabaseOutlined, FileTextOutlined, LogoutOutlined, MenuFoldOutlined,
    MenuUnfoldOutlined, SettingOutlined, SolutionOutlined, TeamOutlined,
    UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout, setUserProfile } from "../features/auth/authSlice";
import { getMyProfile, logoutRequest } from "../features/auth/authApi";
import NotificationBell from "../features/notification/components/NotificationBell";
import { ROLE_LABELS } from "../app/roles";
import { COLORS, GRADIENTS } from "../app/theme";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
type MenuItem = Required<MenuProps>["items"][number];

const item = (key: string, label: string, icon: React.ReactNode): MenuItem => ({ key, label, icon });

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const refreshToken = useAppSelector((state) => state.auth.refreshToken);
    const [collapsed, setCollapsed] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        if (user && !user.fullName) {
            getMyProfile().then((response) => dispatch(setUserProfile(response.data))).catch(() => undefined);
        }
    }, [dispatch, user]);

    const menuItems = useMemo<MenuItem[]>(() => {
        if (!user) return [];
        const dashboard = item("/dashboard", "Tổng quan", <DashboardOutlined />);
        const recruitment = item("/recruitment", "Tuyển dụng", <SolutionOutlined />);
        const candidates = item("/candidates", "Ứng viên", <TeamOutlined />);
        const applications = item("/applications", "Hồ sơ ứng tuyển", <AppstoreOutlined />);
        const interviews = item("/interviews", "Phỏng vấn", <CalendarOutlined />);
        const offers = item("/offers", "Offer", <FileTextOutlined />);
        const settings = item("/settings", "Cài đặt tài khoản", <SettingOutlined />);

        if (user.role === "COMPANY_ADMIN") return [
            dashboard,
            item("/admin/users", "Quản lý người dùng", <UserAddOutlined />),
            item("/masterdata", "Danh mục và phòng ban", <DatabaseOutlined />),
            recruitment, candidates, applications, interviews, offers,
            item("/audit-logs", "Nhật ký bảo mật", <AuditOutlined />),
            settings,
        ];
        if (user.role === "RECRUITER") return [dashboard, recruitment, candidates, applications, interviews, offers, settings];
        if (user.role === "HIRING_MANAGER") return [dashboard, recruitment, candidates, applications, interviews, offers, settings];
        return [
            item("/my-profile", "Hồ sơ của tôi", <UserOutlined />),
            item("/jobs", "Việc làm", <SolutionOutlined />),
            item("/my-applications", "Đơn của tôi", <AppstoreOutlined />),
            item("/my-interviews", "Lịch phỏng vấn", <CalendarOutlined />),
            item("/my-offers", "Offer của tôi", <FileTextOutlined />),
            settings,
        ];
    }, [user]);

    const selectedKey = menuItems
        .map((entry) => entry && "key" in entry ? String(entry.key) : "")
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((key) => location.pathname === key || location.pathname.startsWith(`${key}/`));

    const initials = (user?.fullName || user?.email || "U")
        .split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            if (refreshToken) await logoutRequest(refreshToken);
        } finally {
            dispatch(logout());
            navigate("/login", { replace: true });
        }
    };

    return <Layout style={{ minHeight: "100vh" }}>
        <Sider collapsible collapsed={collapsed} trigger={null} theme="light" width={240} collapsedWidth={64} style={{ borderRight: "1px solid #E5E7EB" }}>
            <div className={`sidebar-logo${collapsed ? " sidebar-logo--collapsed" : ""}`}>
                <div className="sidebar-logo-icon">A</div>
                {!collapsed && <span className="sidebar-logo-text">ATS</span>}
            </div>
            <Menu mode="inline" selectedKeys={selectedKey ? [selectedKey] : []} items={menuItems} onClick={({ key }) => navigate(key)} style={{ borderInlineEnd: 0 }} />
        </Sider>
        <Layout>
            <Header className="app-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: GRADIENTS.header }}>
                <Button
                    type="text"
                    aria-label={collapsed ? "Mở menu" : "Thu gọn menu"}
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setCollapsed((value) => !value)}
                    style={{ color: "#fff" }}
                />
                <Space size={16}>
                    <NotificationBell />
                    <Dropdown menu={{ items: [
                        { key: "settings", icon: <SettingOutlined />, label: "Cài đặt", onClick: () => navigate("/settings") },
                        { type: "divider" },
                        { key: "logout", icon: <LogoutOutlined />, label: loggingOut ? "Đang xuất..." : "Đăng xuất", danger: true, disabled: loggingOut, onClick: handleLogout },
                    ] }}>
                        <Space style={{ cursor: "pointer" }}>
                            <Avatar style={{ background: COLORS.primary }}>{initials}</Avatar>
                            {!collapsed && <div style={{ lineHeight: 1.2 }}>
                                <Text strong style={{ color: "#fff", display: "block" }}>{user?.fullName || user?.email}</Text>
                                {user && <Text style={{ color: "rgba(255,255,255,.72)", fontSize: 12 }}>{ROLE_LABELS[user.role].vi}</Text>}
                            </div>}
                        </Space>
                    </Dropdown>
                </Space>
            </Header>
            <Content style={{ minHeight: 0, overflow: "auto", padding: 20, background: COLORS.body }}>
                <Outlet />
            </Content>
        </Layout>
    </Layout>;
}
