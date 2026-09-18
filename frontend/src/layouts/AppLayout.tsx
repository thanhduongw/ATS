import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from "antd";
import {
    AppstoreOutlined, AuditOutlined, BellOutlined, CalendarOutlined, DashboardOutlined,
    DatabaseOutlined, FileSearchOutlined, FileTextOutlined, LogoutOutlined, MenuFoldOutlined,
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
import { useActiveModuleKey } from "../app/useNavTrail";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
type MenuItem = Required<MenuProps>["items"][number];

const item = (key: string, label: string, icon: React.ReactNode): MenuItem => ({ key, label, icon });

/** Muc cha co muc con — dung cho nhung doi tuong co tu hai man hinh tro len. */
const group = (key: string, label: string, icon: React.ReactNode, children: MenuItem[]): MenuItem =>
    ({ key, label, icon, children });

/** Tieu de nhom, khong bam duoc — chi de tach hai che do lam viec cua admin. */
const section = (key: string, label: string, children: MenuItem[]): MenuItem =>
    ({ key, label, type: "group", children });

/** Gom moi key ke ca muc con, de biet muc nao dang duoc chon. */
function collectKeys(items: MenuItem[]): string[] {
    const keys: string[] = [];
    items.forEach((entry) => {
        if (!entry || !("key" in entry) || entry.key == null) return;
        const node = entry as { key: React.Key; children?: MenuItem[]; type?: string };
        if (node.type !== "group") keys.push(String(node.key));
        if (node.children) keys.push(...collectKeys(node.children));
    });
    return keys;
}

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
        const masterdata = item("/masterdata", "Danh mục", <DatabaseOutlined />);
        const applications = item("/applications", "Hồ sơ ứng viên", <TeamOutlined />);
        const interviews = item("/interviews", "Lịch phỏng vấn", <CalendarOutlined />);
        const notifications = item("/notifications", "Thông báo", <BellOutlined />);
        const settings = item("/settings", "Cài đặt tài khoản", <SettingOutlined />);

        const recruitmentGroup = group("grp-recruitment", "Tuyển dụng", <SolutionOutlined />, [
            item("/recruitment/requisitions", "Yêu cầu tuyển dụng", <SolutionOutlined />),
            item("/recruitment/postings", "Tin tuyển dụng", <FileSearchOutlined />),
        ]);

        const offers = item("/offers", "Đề nghị nhận việc", <FileTextOutlined />);

        if (user.role === "COMPANY_ADMIN") return [
            dashboard,
            section("ops", "Vận hành tuyển dụng", [
                recruitmentGroup, applications, interviews, offers,
            ]),
            section("admin", "Quản trị hệ thống", [
                item("/admin/users", "Người dùng", <UserAddOutlined />),
                masterdata,
                item("/audit-logs", "Nhật ký hệ thống", <AuditOutlined />),
            ]),
            notifications,
            settings,
        ];

        if (user.role === "RECRUITER") return [
            dashboard, masterdata, recruitmentGroup, applications, interviews,
            offers, notifications, settings,
        ];

        // Manager chi tao yeu cau, phong van va theo doi ket qua — khong tham gia buoc offer.
        if (user.role === "HIRING_MANAGER") return [
            dashboard,
            recruitmentGroup,
            item("/applications", "Ứng viên phòng ban", <TeamOutlined />),
            interviews,
            item("/offers", "Kết quả tuyển dụng", <FileTextOutlined />),
            notifications,
            settings,
        ];

        return [
            item("/my-profile", "Hồ sơ của tôi", <UserOutlined />),
            item("/jobs", "Việc làm", <SolutionOutlined />),
            item("/my-applications", "Đơn ứng tuyển của tôi", <AppstoreOutlined />),
            item("/my-interviews", "Lịch phỏng vấn", <CalendarOutlined />),
            item("/my-offers", "Thư mời nhận việc", <FileTextOutlined />),
            notifications,
            settings,
        ];
    }, [user]);

    /**
     * Module dang lam viec do cay route quyet dinh, khong doan theo tien to URL nua.
     * Nho vay /candidates/:id/applications/:id van sang muc "Ho so ung vien",
     * va man hinh mo tu noi khac thi sang dung muc cua noi da di ra.
     */
    const moduleKey = useActiveModuleKey();
    const allKeys = useMemo(() => collectKeys(menuItems), [menuItems]);
    const selectedKey = moduleKey && allKeys.includes(moduleKey) ? moduleKey : undefined;
    // Nhom chua muc dang chon luon duoc mo; nguoi dung van mo them nhom khac duoc.
    const activeGroupKeys = useMemo(
        () => menuItems
            .flatMap((entry) => {
                const node = entry as { key?: React.Key; children?: MenuItem[]; type?: string } | null;
                if (!node) return [];
                return node.type === "group" ? (node.children ?? []) : [entry];
            })
            .filter((entry): entry is MenuItem => !!entry)
            .filter((entry) => {
                const node = entry as { key?: React.Key; children?: MenuItem[] };
                return !!node.children?.length
                    && collectKeys(node.children).some((k) => selectedKey === k);
            })
            .map((entry) => String((entry as { key: React.Key }).key)),
        [menuItems, selectedKey],
    );
    /**
     * Ghi kem duong dan luc nguoi dung tu mo nhom. Sang trang khac thi ban ghi nay het
     * hieu luc, nen cac nhom tu thu lai va chi con nhom chua muc dang xem la mo.
     */
    const [manualOpen, setManualOpen] = useState<{ path: string; keys: string[] } | null>(null);
    const openKeys = manualOpen?.path === location.pathname
        ? manualOpen.keys
        : activeGroupKeys;

    // Mot luc chi mo mot nhom: mo nhom moi thi nhom cu dong lai.
    const handleOpenChange = (keys: string[]) => {
        const justOpened = keys.find((key) => !openKeys.includes(key));
        setManualOpen({ path: location.pathname, keys: justOpened ? [justOpened] : [] });
    };

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

    return <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <Sider
            collapsible
            collapsed={collapsed}
            trigger={null}
            theme="light"
            width={240}
            collapsedWidth={64}
            style={{ borderRight: "1px solid #E5E7EB", height: "100%", overflowY: "auto" }}
        >
            <div className={`sidebar-logo${collapsed ? " sidebar-logo--collapsed" : ""}`}>
                <div className="sidebar-logo-icon">A</div>
                {!collapsed && <span className="sidebar-logo-text">ATS</span>}
            </div>
            <Menu
                mode="inline"
                selectedKeys={selectedKey ? [selectedKey] : []}
                openKeys={openKeys}
                onOpenChange={(keys) => handleOpenChange(keys as string[])}
                items={menuItems}
                onClick={({ key }) => navigate(key)}
                style={{ borderInlineEnd: 0 }}
            />
        </Sider>
        <Layout style={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>
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
                    <Dropdown menu={{
                        items: [
                            { key: "settings", icon: <SettingOutlined />, label: "Cài đặt", onClick: () => navigate("/settings") },
                            { type: "divider" },
                            { key: "logout", icon: <LogoutOutlined />, label: loggingOut ? "Đang xuất..." : "Đăng xuất", danger: true, disabled: loggingOut, onClick: handleLogout },
                        ]
                    }}>
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
            <Content style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: 20, background: COLORS.body }}>
                <Outlet />
            </Content>
        </Layout>
    </Layout>;
}
