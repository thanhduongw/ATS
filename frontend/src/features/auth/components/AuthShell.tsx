import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getPublicCompany } from "../../public/publicApi";
import type { PublicCompanyResponse } from "../../public/types";
import { COLORS } from "../../../app/theme";

/**
 * Khung chung C04–C08: cột trái nền xanh đậm, ảnh đội ngũ bo góc (bannerUrl của A08, chưa có thì hình minh hoạ) kèm câu chào,
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

    return (
        <div className="auth-shell">
            <div className="auth-shell-art">
                <span aria-hidden="true" style={{
                    position: "absolute", right: -100, bottom: -200, width: 520, height: 520, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(42,125,255,0.4), transparent 65%)", pointerEvents: "none",
                }} />
                <button type="button" onClick={() => navigate("/careers/home")} style={{
                    position: "relative", display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", color: "#fff",
                    cursor: "pointer", padding: 0, fontFamily: "inherit", alignSelf: "flex-start",
                }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", color: COLORS.primary, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, overflow: "hidden" }}>
                        {company?.logoUrl ? <img src={company.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : name[0]}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{name}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", opacity: 0.85, textTransform: "uppercase" }}>Tuyển dụng</span>
                    </span>
                </button>
                <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 32 }}>
                    <TeamPicture url={company?.bannerUrl} name={name} />
                    <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{tagline}</span>
                </div>
                <span style={{ position: "relative", fontSize: 13, opacity: 0.7 }}>© {new Date().getFullYear()} {name}</span>
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

/** Khung ảnh đội ngũ (C04/C05): ảnh bìa doanh nghiệp (bannerUrl của A08); chưa có ảnh thì vẽ hình minh hoạ như HTML. */
function TeamPicture({ url, name }: { url?: string | null; name: string }) {
    const box = { position: "relative", height: 280, borderRadius: 28, overflow: "hidden" } as const;
    if (url) return <img src={url} alt={`Đội ngũ ${name}`} style={{ ...box, width: "100%", objectFit: "cover", display: "block" }} />;
    const person = (left: string, w: number) => (
        <span style={{ position: "absolute", left, bottom: 0, width: w, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ width: Math.round(w * 0.52), height: Math.round(w * 0.52), borderRadius: "50%", background: "#7FB2FF", opacity: 0.85 }} />
            <span style={{ width: w, height: w === 56 ? 138 : 144, borderRadius: `${w / 2}px ${w / 2}px 0 0`, background: "#7FB2FF", opacity: 0.55 }} />
        </span>
    );
    return (
        <div aria-hidden="true" style={{ ...box, background: "linear-gradient(140deg, #0B2F78, #2A7DFF 60%, #7FB2FF)" }}>
            <span style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
            <span style={{ position: "absolute", top: 51, left: 59, width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.08)" }} />
            {person("20%", 44)}
            {person("44%", 56)}
            {person("70%", 44)}
        </div>
    );
}
