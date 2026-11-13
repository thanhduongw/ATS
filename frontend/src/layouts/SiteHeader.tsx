import { useEffect, useState } from "react";
import { Dropdown } from "antd";
import { AppstoreOutlined, DownOutlined, LogoutOutlined, SafetyOutlined, UserOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../app/theme";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { defaultRouteForRole } from "../app/roleNavigation";
import { logout, setUserProfile } from "../features/auth/authSlice";
import { getMyProfile, logoutRequest } from "../features/auth/authApi";
import { SITE_HEADER_HEIGHT, useCompanyBrand } from "./siteBrand";
import NotificationBell from "../features/notification/components/NotificationBell";
import { Avatar } from "../components/ui/designKit";

/**
 * Header website tuyển dụng (C01, C02, C03, C20, C27, C28): logo + tên công ty + "TUYỂN DỤNG", điều hướng giữa
 * "Trang chủ · Việc làm" (quyết định 13/11/2026 — bỏ "Về …", "Đời sống" của HTML).
 * Bên phải: khách → Đăng nhập / Đăng ký; ứng viên → chuông thông báo (C27) + menu tài khoản (C28: Tổng quan,
 * Hồ sơ của tôi, Quyền riêng tư, Đăng xuất); nhân viên xem trang công khai → "Trang của tôi".
 */
export default function SiteHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const refreshToken = useAppSelector((s) => s.auth.refreshToken);
    const { name: companyName, logoUrl } = useCompanyBrand();
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        // Tên + ảnh đại diện nạp một lần mỗi phiên (ảnh có thể đổi ở thiết bị khác).
        if (user && (!user.fullName || user.avatarUrl === undefined)) {
            getMyProfile().then((r) => dispatch(setUserProfile(r.data))).catch(() => undefined);
        }
    }, [dispatch, user]);

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

    const path = location.pathname;
    const navLink = (label: string, to: string, active: boolean) => (
        <button
            type="button"
            onClick={() => navigate(to)}
            aria-current={active ? "page" : undefined}
            style={{
                border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: 0,
                fontSize: 16, fontWeight: active ? 700 : 500, color: active ? COLORS.textPrimary : COLORS.textSecondary,
            }}
        >
            {label}
        </button>
    );

    const btn = (primary: boolean) => ({
        display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 20px",
        border: 0, borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 500,
        background: primary ? COLORS.primary : "transparent", color: primary ? COLORS.textOnDark : COLORS.primary,
    } as const);

    const displayName = user?.fullName || user?.email || "";

    return (
        <header
            style={{
                height: SITE_HEADER_HEIGHT, background: COLORS.cardBg, borderBottom: `0.5px solid ${COLORS.border}`,
                position: "sticky", top: 0, zIndex: 20,
            }}
        >
            <div
                className="site-header-row"
                style={{
                    maxWidth: 1200, height: "100%", margin: "0 auto", padding: "0 24px",
                    display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24,
                }}
            >
                <button
                    type="button"
                    onClick={() => navigate("/careers/home")}
                    style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
                            borderRadius: 10, background: logoUrl ? "transparent" : COLORS.primary, color: COLORS.textOnDark, fontWeight: 800, overflow: "hidden",
                        }}
                    >
                        {logoUrl
                            ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} />
                            : (companyName ?? "A").charAt(0).toUpperCase()}
                    </span>
                    <span className="site-header-hide-sm" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span className="site-header-hide-sm" style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                            {companyName ?? "ATS"}
                        </span>
                        <span className="site-header-hide-sm" style={{ fontSize: 12, fontWeight: 500, color: COLORS.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Tuyển dụng
                        </span>
                    </span>
                </button>

                <nav className="site-header-nav" style={{ display: "flex", gap: 36 }} aria-label="Điều hướng chính">
                    {navLink("Trang chủ", "/careers/home", path === "/careers/home")}
                    {navLink("Việc làm", "/careers", path === "/careers" || path.startsWith("/careers/jobs"))}
                </nav>

                <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 12 }}>
                    {!user ? (
                        <>
                            <button type="button" style={btn(false)} onClick={() => navigate("/login")}>Đăng nhập</button>
                            <button type="button" style={btn(true)} onClick={() => navigate("/register")}>Đăng ký</button>
                        </>
                    ) : user.role === "CANDIDATE" ? (
                        <>
                            <NotificationBell />
                            <Dropdown
                                trigger={["click"]}
                                placement="bottomRight"
                                menu={{
                                    items: [
                                        {
                                            key: "who", disabled: true, style: { cursor: "default" },
                                            label: (
                                                <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                                                    <Avatar name={displayName} colorKey={user.userId} size={36} src={user.avatarUrl} />
                                                    <span style={{ display: "flex", flexDirection: "column" }}>
                                                        <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{user.fullName || "Ứng viên"}</span>
                                                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{user.email}</span>
                                                    </span>
                                                </span>
                                            ),
                                        },
                                        { type: "divider" },
                                        { key: "/my-home", icon: <AppstoreOutlined />, label: "Tổng quan" },
                                        { key: "/my-profile", icon: <UserOutlined />, label: "Hồ sơ của tôi" },
                                        { key: "/settings", icon: <SafetyOutlined />, label: "Quyền riêng tư" },
                                        { type: "divider" },
                                        { key: "logout", icon: <LogoutOutlined />, label: loggingOut ? "Đang đăng xuất…" : "Đăng xuất", danger: true, disabled: loggingOut },
                                    ],
                                    onClick: ({ key }) => (key === "logout" ? void handleLogout() : navigate(key)),
                                }}
                            >
                                <button
                                    type="button"
                                    aria-label="Menu tài khoản"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 15, color: COLORS.textPrimary }}
                                >
                                    <Avatar name={displayName} colorKey={user.userId} size={34} src={user.avatarUrl} />
                                    <span className="site-header-hide-sm" style={{ fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.fullName || user.email}</span>
                                    <DownOutlined style={{ fontSize: 11, color: COLORS.textSecondary }} />
                                </button>
                            </Dropdown>
                        </>
                    ) : (
                        <>
                            <button type="button" style={btn(false)} onClick={() => navigate(defaultRouteForRole(user.role))}>Trang của tôi</button>
                            <Avatar name={displayName} colorKey={user.userId} size={36} src={user.avatarUrl} />
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
