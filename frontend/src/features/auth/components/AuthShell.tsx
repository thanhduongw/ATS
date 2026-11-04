import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getPublicCompany } from "../../public/publicApi";
import type { PublicCompanyResponse } from "../../public/types";
import { COLORS } from "../../../app/theme";

/**
 * Khung chung C04–C08: bên trái ảnh bìa doanh nghiệp (bannerUrl của A08, không có thì nền xanh) kèm câu chào,
 * bên phải biểu mẫu. `back` vẽ liên kết "Quay lại…" phía trên tiêu đề.
 */
export default function AuthShell({
    tagline, title, subtitle, back, banner, children,
}: {
    /** Câu lớn ở cột ảnh, ví dụ "Chào mừng quay lại". */
    tagline: string;
    title: string;
    subtitle?: ReactNode;
    back?: { label: string; to: string };
    /** Dải nhỏ phía trên tiêu đề, ví dụ "Ứng tuyển: <tên việc>" (C04). */
    banner?: ReactNode;
    children: ReactNode;
}) {
    const navigate = useNavigate();
    const [company, setCompany] = useState<PublicCompanyResponse | null>(null);

    useEffect(() => {
        getPublicCompany().then((r) => setCompany(r.data)).catch(() => undefined);
    }, []);

    const name = company?.name ?? "ATS";
    const art = company?.bannerUrl
        ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url(${company.bannerUrl})` }
        : { backgroundImage: "linear-gradient(150deg, #0A3FB8 0%, #0A59F7 55%, #4D8BFF 100%)" };

    return (
        <div className="auth-shell">
            <div className="auth-shell-art" style={art}>
                <button type="button" onClick={() => navigate("/careers")} style={{
                    display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", color: "#fff",
                    cursor: "pointer", padding: 0, fontFamily: "inherit", alignSelf: "flex-start",
                }}>
                    {company?.logoUrl
                        ? <img src={company.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", background: "#fff" }} />
                        : <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{name[0]}</span>}
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{name}</span>
                        <span style={{ fontSize: 11, letterSpacing: "0.08em", opacity: 0.85 }}>TUYỂN DỤNG</span>
                    </span>
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{tagline}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>© {new Date().getFullYear()} {name}</span>
                </div>
            </div>

            <div className="auth-shell-form">
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {back && (
                        <a onClick={() => navigate(back.to)} style={{ fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                            <ArrowLeftOutlined /> {back.label}
                        </a>
                    )}
                    {banner}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: "-0.01em" }}>{title}</span>
                        {subtitle && <span style={{ fontSize: 14, color: COLORS.textSecondary }}>{subtitle}</span>}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
