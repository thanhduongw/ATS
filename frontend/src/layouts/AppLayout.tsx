import { Avatar, Dropdown, Layout, Menu, Space, Typography } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    DashboardOutlined, DatabaseOutlined, SolutionOutlined, TeamOutlined, AppstoreOutlined,
    CalendarOutlined, FileTextOutlined, AuditOutlined, LogoutOutlined, UserOutlined,
    ScheduleOutlined, GlobalOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import NotificationBell from "../features/notification/components/NotificationBell";
import { COLORS } from "../app/theme";
import type { UserRole } from "../features/auth/types";
import { ROLE_LABELS } from "../app/roles";
import { useI18n } from "../i18n/I18nProvider";

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const { lang, setLang, t } = useI18n();

    const all = {
        dashboard: { key: "/dashboard", icon: <DashboardOutlined />, label: t("menu.dashboard") },
        masterdata: { key: "/masterdata", icon: <DatabaseOutlined />, label: t("menu.masterdata") },
        recruitment: { key: "/recruitment", icon: <SolutionOutlined />, label: t("menu.recruitment") },
        candidates: { key: "/candidates", icon: <TeamOutlined />, label: t("menu.candidates") },
        applications: { key: "/applications", icon: <AppstoreOutlined />, label: t("menu.applications") },
        scheduling: { key: "/scheduling", icon: <ScheduleOutlined />, label: t("menu.scheduling") },
        interviews: { key: "/interviews", icon: <CalendarOutlined />, label: t("menu.interviews") },
        offers: { key: "/offers", icon: <FileTextOutlined />, label: t("menu.offers") },
        audit: { key: "/audit-logs", icon: <AuditOutlined />, label: t("menu.audit") },
    };

    const MENU_BY_ROLE: Record<UserRole, typeof all[keyof typeof all][]> = {
        PLATFORM_ADMIN: [all.dashboard, all.audit],
        COMPANY_ADMIN: [all.dashboard, all.masterdata, all.recruitment, all.candidates, all.scheduling, all.interviews, all.offers, all.audit],
        RECRUITER: [all.dashboard, all.masterdata, all.recruitment, all.candidates, all.scheduling, all.interviews, all.offers],
        HIRING_MANAGER: [all.dashboard, all.recruitment, all.scheduling, all.interviews],
        INTERVIEWER: [all.dashboard, all.scheduling, all.interviews],
        CANDIDATE: [all.applications, all.scheduling, all.offers],
    };

    const menuItems = user ? MENU_BY_ROLE[user.role] : [];

    const handleLogout = () => { dispatch(logout()); navigate("/login"); };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0" theme="light"
                style={{ borderRight: "1px solid #E5E7EB" }}>
                <div style={{
                    height: 56, display: "flex", alignItems: "center", justifyContent: "center",
                    background: COLORS.header, color: COLORS.accent, fontWeight: 800, fontSize: 20, letterSpacing: 1
                }}>
                    ATS
                </div>
                <Menu mode="inline" selectedKeys={[location.pathname]}
                    items={menuItems} onClick={({ key }) => navigate(key)} style={{ borderInlineEnd: "none" }} />
            </Sider>
            <Layout>
                <Header style={{ padding: "0 24px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                    <Space size="large">
                        <GlobalOutlined style={{ color: COLORS.accent, cursor: "pointer" }}
                            onClick={() => setLang(lang === "vi" ? "en" : "vi")} />
                        <NotificationBell />
                        <Dropdown menu={{
                            items: [{
                                key: "logout", icon: <LogoutOutlined />,
                                label: "Đăng xuất", onClick: handleLogout
                            }]
                        }}>
                            <Space style={{ color: "#fff", cursor: "pointer" }}>
                                <Avatar size="small" icon={<UserOutlined />} style={{ background: COLORS.accent, color: COLORS.header }} />
                                <Typography.Text style={{ color: "#fff" }}>
                                    {ROLE_LABELS[user?.role ?? "CANDIDATE"][lang]}
                                </Typography.Text>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{ margin: 16 }}><Outlet /></Content>
            </Layout>
        </Layout>
    );
}