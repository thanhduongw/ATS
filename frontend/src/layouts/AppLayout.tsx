import { Layout, Menu, Space } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    DashboardOutlined,
    DatabaseOutlined,
    SolutionOutlined,
    TeamOutlined,
    AppstoreOutlined,
    CalendarOutlined,
    FileTextOutlined,
    AuditOutlined,
    LogoutOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import NotificationBell from "../features/notification/components/NotificationBell";

const { Header, Sider, Content } = Layout;

const BASE_MENU_ITEMS = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/masterdata", icon: <DatabaseOutlined />, label: "Master Data" },
    { key: "/recruitment", icon: <SolutionOutlined />, label: "Tuyển dụng" },
    { key: "/candidates", icon: <TeamOutlined />, label: "Ứng viên" },
    { key: "/applications", icon: <AppstoreOutlined />, label: "Ứng tuyển" },
    { key: "/interviews", icon: <CalendarOutlined />, label: "Phỏng vấn" },
    { key: "/offers", icon: <FileTextOutlined />, label: "Offer" },
];

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);

    const menuItems =
        user?.role === "COMPANY_ADMIN"
            ? [...BASE_MENU_ITEMS, { key: "/audit-logs", icon: <AuditOutlined />, label: "Nhật ký hệ thống" }]
            : BASE_MENU_ITEMS;

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0">
                <div style={{ height: 48, margin: 16, color: "#fff", fontWeight: 700, fontSize: 18 }}>ATS</div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: "#fff",
                        padding: "0 24px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                    }}
                >
                    <Space size="large">
                        <NotificationBell />
                        <span>{user?.role}</span>
                        <LogoutOutlined style={{ cursor: "pointer" }} onClick={handleLogout} />
                    </Space>
                </Header>
                <Content style={{ margin: 0, background: "#f5f5f5" }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}