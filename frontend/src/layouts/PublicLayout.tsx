import { useEffect, useState } from "react";
import { Layout } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../app/theme";
import { getPublicCompany } from "../features/public/publicApi";
import { useAppSelector } from "../app/hooks";
import { defaultRouteForRole } from "../app/roleNavigation";
import { Avatar } from "../components/ui/designKit";

const { Content, Footer } = Layout;

/**
 * Khung trang tuyển dụng công khai — thanh trên theo C01/C02: nền trắng cao 76px,
 * logo + tên công ty + "TUYỂN DỤNG", điều hướng giữa, "Đăng nhập" (chữ) và "Đăng ký" (nút chính).
 * Mục "Về …" và "Đời sống" của HTML sẽ thêm khi dựng trang tuyển dụng cố định (T3.2) —
 * chưa có khối đích thì không vẽ liên kết chết.
 */
export default function PublicLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const user = useAppSelector((st) => st.auth.user);

    useEffect(() => {
        getPublicCompany().then((res) => { setCompanyName(res.data?.name ?? null); setLogoUrl(res.data?.logoUrl ?? null); }).catch(() => undefined);
    }, []);

    const navLink = (label: string, to: string) => {
        // "/careers" (danh sách) chỉ sáng ở danh sách và chi tiết việc làm — không sáng ở "/careers/home" (C01).
        const active = location.pathname === to
            || (to === "/careers" ? location.pathname.startsWith("/careers/jobs") : location.pathname.startsWith(`${to}/`));
        return (
            <button
                type="button"
                onClick={() => navigate(to)}
                style={{
                    border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: 0,
                    fontSize: 16, fontWeight: active ? 700 : 500, color: active ? COLORS.textPrimary : COLORS.textSecondary,
                }}
            >
                {label}
            </button>
        );
    };

    const btn = (primary: boolean) => ({
        display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 20px",
        border: 0, borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 500,
        background: primary ? COLORS.primary : "transparent", color: primary ? "#FFFFFF" : COLORS.primary,
    } as const);

    return (
        <Layout style={{ minHeight: "100vh", background: COLORS.body }}>
            <header
                style={{
                    height: 76, background: COLORS.cardBg, borderBottom: `0.5px solid ${COLORS.border}`,
                    position: "sticky", top: 0, zIndex: 10,
                }}
            >
                <div
                    style={{
                        maxWidth: 1200, height: "100%", margin: "0 auto", padding: "0 24px",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate("/careers/home")}
                        style={{ display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
                                borderRadius: 10, background: logoUrl ? "transparent" : COLORS.primary, color: "#FFFFFF", fontWeight: 800, overflow: "hidden",
                            }}
                        >
                            {logoUrl
                                ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} />
                                : (companyName ?? "A").charAt(0).toUpperCase()}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: "-0.01em" }}>
                                {companyName ?? "ATS"}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.textSecondary, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                Tuyển dụng
                            </span>
                        </span>
                    </button>
                    <nav style={{ display: "flex", gap: 36 }}>
                        {navLink("Việc làm", "/careers")}
                        {navLink("Về công ty", "/careers/home")}
                    </nav>
                    {user ? (
                        // Đã đăng nhập (C09/C29): về trang của mình thay cho Đăng nhập / Đăng ký.
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button type="button" style={btn(false)} onClick={() => navigate(defaultRouteForRole(user.role))}>Trang của tôi</button>
                            <Avatar name={user.fullName || user.email} colorKey={user.userId} size={36} />
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button type="button" style={btn(false)} onClick={() => navigate("/login")}>Đăng nhập</button>
                            <button type="button" style={btn(true)} onClick={() => navigate("/register")}>Đăng ký</button>
                        </div>
                    )}
                </div>
            </header>
            <Content style={{ flex: 1 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 40px" }}>
                    <Outlet />
                </div>
            </Content>
            <Footer style={{ textAlign: "center", color: COLORS.textSecondary, background: COLORS.cardBg, fontSize: 13 }}>
                © {new Date().getFullYear()} {companyName ?? "ATS"}
            </Footer>
        </Layout>
    );
}
