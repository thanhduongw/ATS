import { useState } from "react";
import { Button, Input } from "antd";
import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../../app/theme";
import { JobCard } from "../../public/components/JobCard";
import type { PublicCompanyResponse, PublicJobPosting } from "../../public/types";
import type { CareersConfig } from "../careersConfig";
import BenefitIcon from "./BenefitIcon";

/**
 * C01 · Trang tuyển dụng — vẽ 6 khối theo THỨ TỰ CỐ ĐỊNH từ cấu hình A09/A10: Ảnh bìa & khẩu hiệu ·
 * Vị trí nổi bật (tự động từ việc làm đang tuyển) · Đời sống · Phúc lợi · Văn phòng · Chân trang.
 * Khối bị tắt ở A09 thì không vẽ.
 */
export default function CareersBlocks({ config, company, jobs }: {
    config: CareersConfig;
    company: PublicCompanyResponse | null;
    jobs: PublicJobPosting[];
}) {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const v = config.visible;
    const name = company?.name ?? "Công ty";
    const featured = [...jobs].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent)).slice(0, Math.max(1, config.featured.count));
    const offices = [...new Set(jobs.map((j) => j.workLocationName).filter(Boolean) as string[])];
    const search = () => navigate(q.trim() ? `/careers?q=${encodeURIComponent(q.trim())}` : "/careers");
    const section = { display: "flex", flexDirection: "column", gap: 16 } as const;
    const kicker = { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: COLORS.primary } as const;
    const heading = { fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 } as const;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {v.hero && (
                <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 32, alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {config.hero.eyebrow && (
                            <span style={{ ...kicker, fontSize: 13 }}>{config.hero.eyebrow.replace("{jobs}", String(jobs.length))}</span>
                        )}
                        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", whiteSpace: "pre-line" }}>
                            {config.hero.tagline || `Làm việc tại ${name}`}
                        </h1>
                        {config.hero.description && <span style={{ fontSize: 17, color: COLORS.textSecondary }}>{config.hero.description}</span>}
                        <div style={{ display: "flex", gap: 8, maxWidth: 520 }}>
                            <Input size="large" prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />} placeholder="Vị trí, kỹ năng…"
                                value={q} onChange={(e) => setQ(e.target.value)} onPressEnter={search} />
                            <Button size="large" type="primary" onClick={search}>Tìm việc</Button>
                        </div>
                    </div>
                    <div style={{ position: "relative" }}>
                        <div style={{
                            aspectRatio: "16 / 10", borderRadius: 24, background: COLORS.fill, overflow: "hidden",
                            backgroundImage: config.hero.coverUrl ? `url(${config.hero.coverUrl})` : undefined,
                            backgroundSize: "cover", backgroundPosition: "center",
                        }} role="img" aria-label="Ảnh bìa trang tuyển dụng" />
                        {config.hero.quote && (
                            <div style={{
                                position: "absolute", left: -16, bottom: -20, maxWidth: 320, background: COLORS.cardBg, borderRadius: 16,
                                padding: "12px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: 4,
                            }}>
                                <span style={{ fontSize: 14 }}>“{config.hero.quote}”</span>
                                {config.hero.quoteAuthor && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{config.hero.quoteAuthor}</span>}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {v.featured && featured.length > 0 && (
                <section style={section}>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={kicker}>CƠ HỘI ĐANG MỞ</span>
                            <span style={heading}>{config.featured.title}</span>
                        </div>
                        <a onClick={() => navigate("/careers")} style={{ fontWeight: 600 }}>Xem tất cả {jobs.length} việc làm</a>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                        {featured.map((j) => <JobCard key={j.id} job={j} />)}
                    </div>
                </section>
            )}

            {v.life && config.life.photos.length > 0 && (
                <section id="life" style={section}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={kicker}>ĐỜI SỐNG</span>
                        <span style={heading}>{config.life.title}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                        {config.life.photos.map((p, i) => (
                            <figure key={`${p.url}-${i}`} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                                <img src={p.url} alt={p.caption || `Ảnh đời sống ${i + 1}`}
                                    style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 16 }} />
                                {p.caption && <figcaption style={{ fontSize: 13, color: COLORS.textSecondary }}>{p.caption}</figcaption>}
                            </figure>
                        ))}
                    </div>
                </section>
            )}

            {v.benefits && config.benefits.items.some((b) => b.title.trim()) && (
                <section style={section}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={kicker}>PHÚC LỢI</span>
                        <span style={{ ...heading, whiteSpace: "pre-line" }}>{config.benefits.title}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                        {config.benefits.items.filter((b) => b.title.trim()).map((b, i) => (
                            <div key={`${b.title}-${i}`} style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 16, background: COLORS.cardBg }}>
                                <BenefitIcon icon={b.icon} />
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <b>{b.title}</b>
                                    {b.description && <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{b.description}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {v.offices && (offices.length > 0 || company?.address) && (
                <section style={section}>
                    <span style={heading}>{config.offices.title}</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                        {company?.address && (
                            <div style={{ display: "flex", gap: 10, padding: 16, borderRadius: 16, background: COLORS.cardBg }}>
                                <EnvironmentOutlined style={{ color: COLORS.primary, marginTop: 3 }} />
                                <div style={{ display: "flex", flexDirection: "column" }}><b>Trụ sở</b><span style={{ fontSize: 13, color: COLORS.textSecondary }}>{company.address}</span></div>
                            </div>
                        )}
                        {offices.map((o) => (
                            <div key={o} style={{ display: "flex", gap: 10, padding: 16, borderRadius: 16, background: COLORS.cardBg }}>
                                <EnvironmentOutlined style={{ color: COLORS.primary, marginTop: 3 }} /><b>{o}</b>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {v.footer && (
                <footer style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))", gap: 24, padding: "28px 0", borderTop: `0.5px solid ${COLORS.border}`, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <b style={{ fontSize: 15 }}>{name}</b>
                        {config.hero.tagline && <span style={{ color: COLORS.textSecondary }}>{config.hero.tagline.replace(/\n/g, " ")}</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <b>{name}</b>
                        <a onClick={() => navigate("/careers")}>Việc làm</a>
                        {v.life && config.life.photos.length > 0 && <a href="#life">Đời sống</a>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, color: COLORS.textSecondary }}>
                        <b style={{ color: COLORS.textPrimary }}>Liên hệ</b>
                        {company?.recruitingEmail && <span>{company.recruitingEmail}</span>}
                        {company?.phone && <span>{company.phone}</span>}
                        {company?.address && <span>{company.address}</span>}
                    </div>
                </footer>
            )}
        </div>
    );
}
