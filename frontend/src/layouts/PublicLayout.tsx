import { useEffect, useState } from "react";
import { Layout } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../app/theme";
import { getPublicCompany } from "../features/public/publicApi";

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

    useEffect(() => {
        getPublicCompany().then((res) => setCompanyName(res.data?.name ?? null)).catch(() => undefined);
    }, []);

    const navLink = (label: string, to: string) => {
        const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
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
                        onClick={() => navigate("/careers")}
                        style={{ display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
                                borderRadius: 10, background: COLORS.primary, color: "#FFFFFF", fontWeight: 800,
                            }}
                        >
                            {(companyName ?? "A").charAt(0).toUpperCase()}
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
                    </nav>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" style={btn(false)} onClick={() => navigate("/login")}>Đăng nhập</button>
                        <button type="button" style={btn(true)} onClick={() => navigate("/register")}>Đăng ký</button>
                    </div>
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
