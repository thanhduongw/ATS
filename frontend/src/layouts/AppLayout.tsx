import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dropdown, Layout } from "antd";
import {
    AppstoreOutlined, AuditOutlined, BankOutlined, CalendarOutlined, CheckSquareOutlined,
    DashboardOutlined, DatabaseOutlined, FileDoneOutlined, FileTextOutlined, GlobalOutlined,
    LogoutOutlined, PlusOutlined, SafetyOutlined, SettingOutlined, SolutionOutlined,
    TeamOutlined, UserOutlined, BellOutlined, BarChartOutlined, RightOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout, setUserProfile } from "../features/auth/authSlice";
import { getMyProfile, logoutRequest } from "../features/auth/authApi";
import NotificationBell from "../features/notification/components/NotificationBell";
import { getPublicCompany } from "../features/public/publicApi";
import { getOpenPostings, getPostings, getRequisitions } from "../features/recruitment/recruitmentApi";
import { getApplications } from "../features/candidate/applicationApi";
import { getOffers } from "../features/offer/offerApi";
import { ROLE_LABELS } from "../app/roles";
import { COLORS, LAYOUT, STAGE_COLORS } from "../app/theme";
import { useActiveModuleKey } from "../app/useNavTrail";
import { Avatar } from "../components/ui/designKit";
import type { UserRole } from "../features/auth/types";

const { Content } = Layout;

/* ============================================================
   Khung ứng dụng nội bộ — DS04 "Khung ứng dụng nội bộ", R01, H01, A01, C20.
   Thanh bên 232px và thanh trên 60px dùng CÙNG nền trang #f1f3f5 (không có thanh màu riêng).
   Theo quyết định A6: không có ô tìm kiếm Ctrl K (Q1: bỏ hẳn ô tìm kiếm ở thanh trên).
   Theo quyết định C1: Quản trị doanh nghiệp không có mục vận hành tuyển dụng.
============================================================ */

interface NavItem {
    key: string;
    label: string;
    icon: ReactNode;
    /** Số trên mục: đỏ = cần xử lý, xám = số lượng. */
    badge?: { count: number; tone: "alert" | "muted" };
}

/** Menu theo vai trò — đúng thứ tự và chữ trong HTML. */
function menuFor(role: UserRole): NavItem[] {
    switch (role) {
        // R01
        case "RECRUITER":
            return [
                { key: "/my-work", label: "Việc của tôi", icon: <CheckSquareOutlined /> },
                { key: "/recruitment/requisitions", label: "Yêu cầu tuyển dụng", icon: <SolutionOutlined /> },
                { key: "/recruitment/postings", label: "Việc làm", icon: <FileTextOutlined /> },
                { key: "/applications", label: "Ứng viên", icon: <TeamOutlined /> },
                { key: "/interviews", label: "Lịch phỏng vấn", icon: <CalendarOutlined /> },
                { key: "/offers", label: "Thư mời", icon: <FileDoneOutlined /> },
                { key: "/masterdata", label: "Danh mục", icon: <DatabaseOutlined /> },
            ];
        // H01
        case "HIRING_MANAGER":
            return [
                { key: "/my-work", label: "Việc của tôi", icon: <CheckSquareOutlined /> },
                { key: "/recruitment/requisitions", label: "Yêu cầu tuyển dụng", icon: <SolutionOutlined /> },
                { key: "/applications", label: "Ứng viên", icon: <TeamOutlined /> },
                { key: "/interviews", label: "Lịch phỏng vấn", icon: <CalendarOutlined /> },
                { key: "/offers", label: "Kết quả tuyển dụng", icon: <BarChartOutlined /> },
            ];
        // A01 + C6 (mục riêng "Nhật ký hệ thống")
        case "COMPANY_ADMIN":
            return [
                { key: "/dashboard", label: "Tổng quan", icon: <DashboardOutlined /> },
                { key: "/admin/users", label: "Người dùng", icon: <UserOutlined /> },
                { key: "/admin/company", label: "Thông tin doanh nghiệp", icon: <BankOutlined /> },
                { key: "/careers", label: "Trang tuyển dụng", icon: <GlobalOutlined /> },
                { key: "/audit-logs", label: "Nhật ký hệ thống", icon: <AuditOutlined /> },
            ];
        // C20 — cổng ứng viên
        default:
            return [
                { key: "/jobs", label: "Việc làm", icon: <AppstoreOutlined /> },
                { key: "/my-applications", label: "Đơn ứng tuyển", icon: <FileTextOutlined /> },
                { key: "/my-interviews", label: "Lịch phỏng vấn", icon: <CalendarOutlined /> },
                { key: "/my-offers", label: "Thư mời nhận việc", icon: <FileDoneOutlined /> },
                { key: "/notifications", label: "Thông báo", icon: <BellOutlined /> },
                { key: "/my-profile", label: "Hồ sơ của tôi", icon: <UserOutlined /> },
                { key: "/settings", label: "Quyền riêng tư", icon: <SafetyOutlined /> },
            ];
    }
}

/** Số trên menu của Chuyên viên tuyển dụng (R01): yêu cầu chờ duyệt (đỏ), việc làm đang tuyển (xám), thư mời nháp (đỏ). */
function useRecruiterBadges(enabled: boolean) {
    const [badges, setBadges] = useState<Record<string, NavItem["badge"]>>({});
    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        Promise.allSettled([
            getRequisitions({ status: "PENDING_APPROVAL", page: 0, size: 1 }),
            getPostings({ status: "OPEN", page: 0, size: 1 }),
            getOffers({ status: "DRAFT", page: 0, size: 1 }),
        ]).then(([req, post, offer]) => {
            if (!alive) return;
            const next: Record<string, NavItem["badge"]> = {};
            if (req.status === "fulfilled" && req.value.data.totalItems > 0)
                next["/recruitment/requisitions"] = { count: req.value.data.totalItems, tone: "alert" };
            if (post.status === "fulfilled" && post.value.data.totalItems > 0)
                next["/recruitment/postings"] = { count: post.value.data.totalItems, tone: "muted" };
            if (offer.status === "fulfilled" && offer.value.data.totalItems > 0)
                next["/offers"] = { count: offer.value.data.totalItems, tone: "alert" };
            setBadges(next);
        });
        return () => { alive = false; };
    }, [enabled]);
    return badges;
}

/** "Việc làm ghim" (R01): việc làm đang tuyển kèm số ứng viên, tối đa 3. */
function usePinnedPostings(enabled: boolean) {
    const [items, setItems] = useState<{ id: number; title: string; count?: number }[]>([]);
    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        getOpenPostings()
            .then(async (res) => {
                const top = (res.data ?? []).slice(0, 3);
                const counts = await Promise.allSettled(
                    top.map((p) => getApplications({ jobPostingId: p.id, page: 0, size: 1 })),
                );
                if (!alive) return;
                setItems(top.map((p, i) => {
                    const c = counts[i];
                    return { id: p.id, title: p.title, count: c.status === "fulfilled" ? c.value.data.totalItems : undefined };
                }));
            })
            .catch(() => undefined);
        return () => { alive = false; };
    }, [enabled]);
    return items;
}

const PIN_COLORS = [COLORS.primary, COLORS.interview, STAGE_COLORS.SCREENING.color];

function SideNavItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            style={{
                display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 12px", width: "100%",
                border: 0, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                background: active ? COLORS.primarySoft : "transparent",
                color: active ? COLORS.primary : COLORS.textPrimary,
                fontSize: 14, fontWeight: active ? 600 : 400,
            }}
        >
            <span style={{ fontSize: 18, display: "inline-flex" }}>{item.icon}</span>
            <span style={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
            {item.badge && (
                <span
                    style={{
                        minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: item.badge.tone === "alert" ? COLORS.error : COLORS.fill,
                        color: item.badge.tone === "alert" ? "#FFFFFF" : COLORS.textSecondary,
                    }}
                >
                    {item.badge.count}
                </span>
            )}
        </button>
    );
}

export default function AppLayout() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const refreshToken = useAppSelector((state) => state.auth.refreshToken);
    const [loggingOut, setLoggingOut] = useState(false);
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        if (user && !user.fullName) {
            getMyProfile().then((response) => dispatch(setUserProfile(response.data))).catch(() => undefined);
        }
    }, [dispatch, user]);

    // Tên công ty lấy từ API, không viết cứng (mục 0.1 của kế hoạch).
    useEffect(() => {
        getPublicCompany().then((res) => setCompanyName(res.data?.name ?? null)).catch(() => undefined);
    }, []);

    const isRecruiter = user?.role === "RECRUITER";
    const badges = useRecruiterBadges(isRecruiter);
    const pinned = usePinnedPostings(isRecruiter);

    const items = useMemo<NavItem[]>(
        () => (user ? menuFor(user.role).map((it) => ({ ...it, badge: badges[it.key] ?? it.badge })) : []),
        [user, badges],
    );

    const moduleKey = useActiveModuleKey();
    const selectedKey = moduleKey && items.some((it) => it.key === moduleKey) ? moduleKey : undefined;

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

    // R30 "Danh sách tạo mới" — chỉ Chuyên viên tuyển dụng.
    const createMenu = [
        { key: "/recruitment/postings", title: "Việc làm", hint: "Từ yêu cầu tuyển dụng đã duyệt", icon: <FileTextOutlined /> },
        { key: "/applications", title: "Ứng viên", hint: "Thêm thủ công vào việc làm", icon: <TeamOutlined /> },
        { key: "/interviews", title: "Lịch phỏng vấn", hint: "Gửi khung giờ", icon: <CalendarOutlined /> },
        { key: "/offers/compare", title: "Thư mời", hint: "Từ màn so sánh", icon: <FileDoneOutlined /> },
    ];

    const circleBtn = {
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 17, background: COLORS.cardBg, cursor: "pointer",
    } as const;

    return (
        <Layout style={{ height: "100vh", overflow: "hidden", background: COLORS.body, flexDirection: "row" }}>
            <aside
                style={{
                    width: LAYOUT.siderWidth, flexShrink: 0, height: "100%", overflowY: "auto", background: COLORS.siderBg,
                    padding: "14px 10px", display: "flex", flexDirection: "column", gap: 4,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 6px 14px" }}>
                    <span
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
                            borderRadius: 10, background: COLORS.primary, color: "#FFFFFF", fontWeight: 800, flexShrink: 0,
                        }}
                    >
                        {(companyName ?? "A").charAt(0).toUpperCase()}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {companyName ?? "ATS"}
                        </span>
                        <span style={{ fontSize: 11, color: COLORS.textSecondary }}>Tuyển dụng</span>
                    </div>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {items.map((it) => (
                        <SideNavItem key={it.key} item={it} active={selectedKey === it.key} onClick={() => navigate(it.key)} />
                    ))}
                </nav>

                {isRecruiter && pinned.length > 0 && (
                    <>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary, padding: "0 12px", marginTop: 8 }}>Việc làm ghim</div>
                        {pinned.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => navigate(`/recruitment/postings/${p.id}`)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, height: 32, padding: "0 12px", width: "100%",
                                    border: 0, borderRadius: 12, background: "transparent", cursor: "pointer", fontFamily: "inherit",
                                    fontSize: 13, color: COLORS.textPrimary, textAlign: "left",
                                }}
                            >
                                <span style={{ width: 8, height: 8, borderRadius: 4, background: PIN_COLORS[i % PIN_COLORS.length], flexShrink: 0 }} />
                                <span style={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
                                {p.count != null && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{p.count}</span>}
                            </button>
                        ))}
                    </>
                )}

                {user?.role !== "CANDIDATE" && (
                    <div style={{ marginTop: "auto" }}>
                        <SideNavItem
                            item={{ key: "/settings", label: "Cài đặt", icon: <SettingOutlined /> }}
                            active={moduleKey === "/settings"}
                            onClick={() => navigate("/settings")}
                        />
                    </div>
                )}
            </aside>

            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <header
                    style={{
                        display: "flex", alignItems: "center", gap: 12, height: LAYOUT.headerHeight, flexShrink: 0,
                        padding: "0 24px 0 4px", background: COLORS.header,
                    }}
                >
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                        {isRecruiter && (
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    items: createMenu.map((m) => ({
                                        key: m.key,
                                        icon: m.icon,
                                        label: (
                                            <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 260 }}>
                                                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                                                    <span style={{ fontWeight: 600 }}>{m.title}</span>
                                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{m.hint}</span>
                                                </div>
                                                <RightOutlined style={{ fontSize: 11, color: COLORS.textMuted }} />
                                            </div>
                                        ),
                                    })),
                                    onClick: ({ key }) => navigate(key),
                                }}
                            >
                                <button
                                    type="button"
                                    style={{
                                        display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 17px",
                                        border: 0, borderRadius: 17, background: COLORS.primary, color: "#FFFFFF",
                                        fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer",
                                    }}
                                >
                                    <PlusOutlined />Tạo mới
                                </button>
                            </Dropdown>
                        )}
                        <span style={circleBtn}><NotificationBell /></span>
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: [
                                    {
                                        key: "who",
                                        disabled: true,
                                        label: (
                                            <div style={{ display: "flex", flexDirection: "column", color: COLORS.textPrimary }}>
                                                <span style={{ fontWeight: 600 }}>{user?.fullName || user?.email}</span>
                                                {user && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{ROLE_LABELS[user.role].vi}</span>}
                                            </div>
                                        ),
                                    },
                                    { type: "divider" },
                                    { key: "settings", icon: <SettingOutlined />, label: "Cài đặt", onClick: () => navigate("/settings") },
                                    { key: "logout", icon: <LogoutOutlined />, label: loggingOut ? "Đang đăng xuất…" : "Đăng xuất", danger: true, disabled: loggingOut, onClick: handleLogout },
                                ],
                            }}
                        >
                            <span style={{ cursor: "pointer", display: "inline-flex" }} aria-label="Tài khoản">
                                <Avatar name={user?.fullName || user?.email} colorKey={user?.userId ?? user?.email} size={34} />
                            </span>
                        </Dropdown>
                    </div>
                </header>
                <Content style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "4px 24px 32px 4px", background: COLORS.body }}>
                    <Outlet />
                </Content>
            </div>
        </Layout>
    );
}
