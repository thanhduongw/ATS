import { useState, type ReactNode } from "react";
import { Button, Input, Modal, Select } from "antd";
import {
    ApartmentOutlined, ArrowRightOutlined, ClockCircleOutlined, EnvironmentOutlined, PictureOutlined, SearchOutlined, SendOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { relativeTime } from "../../../app/datetime";
import StatusTag from "../../../components/ui/StatusTag";
import { arrangementLabel, salaryText } from "../../public/jobFormat";
import type { PublicCompanyResponse, PublicJobPosting } from "../../public/types";
import { HERO_IMAGE_SCRIM, heroBackgroundCss, type CareersConfig } from "../careersConfig";
import BenefitIcon from "./BenefitIcon";

/**
 * C01 · Trang tuyển dụng — vẽ 6 khối theo THỨ TỰ CỐ ĐỊNH từ cấu hình A09/A10: Ảnh bìa & khẩu hiệu ·
 * Vị trí nổi bật (tự động từ việc làm đang tuyển) · Đời sống · Phúc lợi · Văn phòng · Chân trang.
 * Khối bị tắt ở A09 thì không vẽ. Bố cục theo Candidate.html: dải xanh đậm tràn ngang (ảnh bìa + ảnh đời sống
 * đầu tiên xếp chồng), thẻ việc làm dọc 3 cột, lưới ảnh 1 lớn + 4 nhỏ, phúc lợi trong dải xanh (nửa trái là ảnh mờ dần),
 * chân trang xanh đậm. "Văn phòng" không có trong HTML — giữ vì Quản trị bật/tắt được ở A09.
 */
export default function CareersBlocks({ config, company, jobs }: {
    config: CareersConfig;
    company: PublicCompanyResponse | null;
    jobs: PublicJobPosting[];
}) {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [loc, setLoc] = useState<string>("");
    const [policyOpen, setPolicyOpen] = useState(false);
    const v = config.visible;
    const name = company?.name ?? "Công ty";
    const featured = [...jobs].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent)).slice(0, Math.max(1, config.featured.count));
    const offices = [...new Set(jobs.map((j) => j.workLocationName).filter(Boolean) as string[])];
    const photos = config.life.photos.filter((p) => p.url);
    // Không có ảnh bìa thì lấy ảnh đời sống đầu tiên; không có ảnh nào thì phần đầu trang chỉ còn chữ trên nền màu.
    const heroMain = config.hero.coverUrl || photos[0]?.url;
    const heroSide = config.hero.coverUrl ? photos[0] : undefined;
    const heroArt = !!heroMain;
    const heroImage = config.hero.background === "image" ? config.hero.backgroundUrl : undefined;
    // Ảnh khối Phúc lợi: ảnh Quản trị chọn ở A09; chưa chọn thì lấy ảnh đời sống chưa dùng ở phần đầu trang.
    const benefitsPhoto = config.benefits.imageUrl || photos[1]?.url || photos[0]?.url || config.hero.coverUrl || undefined;
    const search = () => {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        if (loc) p.set("loc", loc);
        navigate(p.size ? `/careers?${p}` : "/careers");
    };
    const bleed = { width: "100vw", marginLeft: "calc(50% - 50vw)" } as const;
    const inner = { maxWidth: 1200, margin: "0 auto", padding: "0 24px" } as const;
    const kicker = { fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: COLORS.primary, textTransform: "uppercase" } as const;
    const heading = { fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, color: COLORS.textPrimary } as const;
    const onDark = (a: number) => `rgba(255,255,255,${a})`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 72 }}>
            {v.hero && (
                <section style={{
                    ...bleed, marginTop: -28, color: COLORS.textOnDark, position: "relative", overflow: "hidden", isolation: "isolate",
                    background: heroImage ? "#0b1520" : heroBackgroundCss(config.hero, GRADIENTS.hero),
                }}>
                    {/* Nền ảnh: làm mờ (blur) + phủ lớp tối để ảnh không lấn chữ và ảnh bìa phía trên. */}
                    {heroImage && (<>
                        <div aria-hidden style={{ position: "absolute", inset: -24, zIndex: -2, background: `center / cover no-repeat url(${heroImage})`, filter: "blur(2px)" }} />
                        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, background: HERO_IMAGE_SCRIM }} />
                    </>)}
                    <div className="careers-hero" style={{ ...inner, padding: "64px 24px 72px", display: "grid", gridTemplateColumns: heroArt ? "minmax(0, 1.05fr) minmax(0, 1fr)" : "minmax(0, 760px)", gap: 48, alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
                            {config.hero.eyebrow && (
                                <span style={{
                                    alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px",
                                    borderRadius: 15, background: onDark(0.12), fontSize: 13, fontWeight: 500,
                                }}>
                                    <SendOutlined style={{ fontSize: 12 }} />{config.hero.eyebrow.replace("{jobs}", String(jobs.length))}
                                </span>
                            )}
                            <h1 style={{ margin: 0, fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", whiteSpace: "pre-line", color: "inherit" }}>
                                {config.hero.tagline || `Làm việc tại ${name}`}
                            </h1>
                            {config.hero.description && <span style={{ fontSize: 18, color: onDark(0.8) }}>{config.hero.description}</span>}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 4, maxWidth: 560, height: 56, padding: "0 6px 0 16px",
                                borderRadius: 28, background: COLORS.cardBg, boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                            }}>
                                <SearchOutlined style={{ color: COLORS.textMuted }} />
                                <Input variant="borderless" placeholder="Vị trí, kỹ năng…" value={q}
                                    onChange={(e) => setQ(e.target.value)} onPressEnter={search} style={{ flex: 1, fontSize: 15 }} />
                                {offices.length > 0 && (
                                    <span className="careers-search-loc" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 1, height: 28, background: COLORS.border }} />
                                        <EnvironmentOutlined style={{ color: COLORS.textMuted, marginLeft: 8 }} />
                                        <Select variant="borderless" value={loc} onChange={setLoc} popupMatchSelectWidth={false} style={{ width: 130 }}
                                            options={[{ value: "", label: "Mọi nơi" }, ...offices.map((o) => ({ value: o, label: o }))]} />
                                    </span>
                                )}
                                <Button type="primary" size="large" shape="round" onClick={search}>Tìm việc</Button>
                            </div>
                        </div>
                        {heroArt && <div className="careers-hero-art" style={{ position: "relative", height: 460 }}>
                            <Photo url={heroMain} label="Ảnh bìa trang tuyển dụng"
                                style={{ position: "absolute", top: 0, right: 0, width: "90%", height: 360, borderRadius: 28 }} />
                            {heroSide && (
                                <Photo url={heroSide.url} label={heroSide.caption || "Ảnh đời sống"}
                                    style={{ position: "absolute", left: 0, bottom: 0, width: "46%", height: 230, borderRadius: 24, boxShadow: "0 16px 40px rgba(0,0,0,0.3)" }} />
                            )}
                        </div>}
                    </div>
                </section>
            )}

            {v.featured && featured.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={kicker}>Cơ hội đang mở</span>
                            <span style={heading}>{config.featured.title}</span>
                        </div>
                        <Button size="large" shape="round" icon={<ArrowRightOutlined />} onClick={() => navigate("/careers")}
                            style={{ background: COLORS.fill, border: 0, color: COLORS.primary }}>
                            Xem tất cả {jobs.length} việc làm
                        </Button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                        {featured.map((j) => <FeaturedJob key={j.id} job={j} />)}
                    </div>
                </section>
            )}

            {v.life && photos.length > 0 && (
                <section id="life" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={kicker}>Đời sống</span>
                        <span style={heading}>{config.life.title}</span>
                    </div>
                    {/* Lưới như HTML: ảnh đầu lớn (2 hàng), tối đa 4 ảnh nhỏ bên phải. */}
                    <div className="careers-life" style={{
                        display: "grid", gap: 16,
                        gridTemplateColumns: photos.length >= 3 ? "minmax(0, 2fr) repeat(2, minmax(0, 1fr))" : `repeat(${photos.length}, minmax(0, 1fr))`,
                        gridAutoRows: 220,
                    }}>
                        {photos.slice(0, 5).map((p, i) => (
                            <Photo key={`${p.url}-${i}`} url={p.url} label={p.caption || `Ảnh đời sống ${i + 1}`} caption={p.caption}
                                style={{ borderRadius: 24, height: "100%", gridRow: i === 0 && photos.length >= 3 ? "span 2" : undefined }} />
                        ))}
                    </div>
                </section>
            )}

            {v.benefits && config.benefits.items.some((b) => b.title.trim()) && (
                <section className="careers-benefits" style={{
                    position: "relative", overflow: "hidden", isolation: "isolate",
                    display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 48, padding: "56px",
                    borderRadius: 32, background: "linear-gradient(120deg, var(--ats-brand-deep2), var(--ats-brand))", color: COLORS.textOnDark,
                }}>
                    {/* Nửa trái là ảnh, mờ dần sang màu thương hiệu ở nửa phải; lớp tối phía dưới giữ chữ tiêu đề dễ đọc. */}
                    {benefitsPhoto && (
                        <div aria-hidden className="careers-benefits-photo" style={{
                            position: "absolute", inset: "0 auto 0 0", width: "52%", zIndex: -1,
                            background: `linear-gradient(0deg, rgba(0,0,0,0.45), rgba(0,0,0,0.1) 60%), center / cover no-repeat url(${benefitsPhoto})`,
                            WebkitMaskImage: "linear-gradient(90deg, #000 45%, transparent)", maskImage: "linear-gradient(90deg, #000 45%, transparent)",
                        }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: benefitsPhoto ? "flex-end" : undefined, textShadow: benefitsPhoto ? "0 2px 12px rgba(0,0,0,0.35)" : undefined }}>
                        <span style={{ ...kicker, color: onDark(0.7) }}>Phúc lợi</span>
                        <span style={{ ...heading, color: "inherit", whiteSpace: "pre-line" }}>{config.benefits.title}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "24px 32px", alignContent: "center" }}>
                        {config.benefits.items.filter((b) => b.title.trim()).map((b, i) => (
                            <div key={`${b.title}-${i}`} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                <BenefitIcon icon={b.icon} size={44} onDark />
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <b style={{ fontSize: 16 }}>{b.title}</b>
                                    {b.description && <span style={{ fontSize: 13, color: onDark(0.7) }}>{b.description}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {v.offices && (offices.length > 0 || company?.address) && (
                <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <span style={heading}>{config.offices.title}</span>
                    {/* auto-fit: ít văn phòng thì các thẻ giãn ra lấp đủ chiều ngang như các khối phía trên. */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                        {company?.address && <Office title="Trụ sở" detail={company.address} />}
                        {offices.map((o) => <Office key={o} title={o} />)}
                    </div>
                </section>
            )}

            {v.footer && (
                <footer style={{ ...bleed, marginBottom: -40, background: "var(--ats-brand-deep)", color: onDark(0.7), fontSize: 14 }}>
                    <div style={{ ...inner, padding: "48px 24px 28px", display: "flex", flexDirection: "column", gap: 32 }}>
                        <div className="careers-footer" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.2fr)", gap: 32 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{
                                        width: 36, height: 36, borderRadius: 10, background: "#fff", color: COLORS.primary, overflow: "hidden",
                                        display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
                                    }}>
                                        {company?.logoUrl ? <img src={company.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : name.charAt(0)}
                                    </span>
                                    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                                        <b style={{ fontSize: 16, color: COLORS.textOnDark }}>{name}</b>
                                        <span style={{ fontSize: 11, letterSpacing: "0.06em" }}>TUYỂN DỤNG</span>
                                    </span>
                                </span>
                                {config.hero.tagline && <span>{config.hero.tagline.replace(/\n/g, " ")}</span>}
                            </div>
                            <FooterCol title={name}>
                                <FooterLink onClick={() => navigate("/careers")}>Việc làm</FooterLink>
                                {v.life && photos.length > 0 && <FooterLink href="#life">Đời sống</FooterLink>}
                            </FooterCol>
                            <FooterCol title="Liên hệ">
                                {company?.recruitingEmail && <span>{company.recruitingEmail}</span>}
                                {company?.phone && <span>{company.phone}</span>}
                                {company?.address && <span>{company.address}</span>}
                            </FooterCol>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingTop: 20, borderTop: `1px solid ${onDark(0.1)}`, fontSize: 13 }}>
                            <span>© {new Date().getFullYear()} {name}</span>
                            {company?.privacyPolicy && <FooterLink onClick={() => setPolicyOpen(true)}>Chính sách bảo mật dữ liệu ứng viên</FooterLink>}
                        </div>
                    </div>
                    <Modal open={policyOpen} onCancel={() => setPolicyOpen(false)} footer={null} title="Chính sách bảo mật dữ liệu ứng viên" width={640}>
                        <div style={{ whiteSpace: "pre-wrap", maxHeight: "60vh", overflowY: "auto" }}>{company?.privacyPolicy}</div>
                    </Modal>
                </footer>
            )}
        </div>
    );
}

/** Ảnh bo góc; chưa có ảnh thì khối màu xanh có vòng tròn mờ như ô giữ chỗ của HTML. Chú thích nằm trong viên thuốc góc trên. */
function Photo({ url, label, caption, style }: { url?: string; label: string; caption?: string; style: React.CSSProperties }) {
    return (
        <div role="img" aria-label={label} style={{
            position: "relative", overflow: "hidden",
            background: url ? `center / cover no-repeat url(${url})` : "linear-gradient(140deg, var(--ats-brand), var(--ats-brand-hover))", ...style,
        }}>
            {!url && <span style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />}
            {caption && (
                <span style={{
                    position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px",
                    borderRadius: 13, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12, fontWeight: 500,
                }}><PictureOutlined />{caption}</span>
            )}
        </div>
    );
}

/** Thẻ việc làm dọc của C01: chip phòng ban / tuyển gấp · tên · địa điểm, hình thức, loại hình · lương xanh + thời gian. */
function FeaturedJob({ job }: { job: PublicJobPosting }) {
    const navigate = useNavigate();
    const arrangement = arrangementLabel(job);
    const meta: { icon: ReactNode; text: string }[] = [];
    if (job.workLocationName) meta.push({ icon: <EnvironmentOutlined />, text: job.workLocationName });
    if (arrangement) meta.push({ icon: <ApartmentOutlined />, text: arrangement });
    if (job.employmentTypeName) meta.push({ icon: <ClockCircleOutlined />, text: job.employmentTypeName });
    return (
        <div className="row-clickable" onClick={() => navigate(`/careers/jobs/${job.id}`)} style={{
            display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: 20, background: COLORS.cardBg, cursor: "pointer",
        }}>
            {(job.departmentName || job.urgent) && (
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {job.departmentName && <StatusTag label={job.departmentName} tone="brand" />}
                    {job.urgent && <StatusTag label="Tuyển gấp" tone="danger" />}
                </span>
            )}
            <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.35, flex: 1 }}>{job.title}</span>
            <span style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: COLORS.textSecondary }}>
                {meta.map((m) => <span key={m.text} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{m.icon}{m.text}</span>)}
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <b style={{ fontSize: 16, color: COLORS.primary }}>{salaryText(job.salaryMin, job.salaryMax)}</b>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{relativeTime(job.publishedAt)}</span>
            </span>
        </div>
    );
}

function Office({ title, detail }: { title: string; detail?: string }) {
    return (
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 18, borderRadius: 20, background: COLORS.cardBg }}>
            <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: COLORS.primarySoft, color: COLORS.primary,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}><EnvironmentOutlined /></span>
            <span style={{ display: "flex", flexDirection: "column" }}>
                <b>{title}</b>
                {detail && <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{detail}</span>}
            </span>
        </div>
    );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ color: COLORS.textOnDark, marginBottom: 4 }}>{title}</b>
            {children}
        </div>
    );
}

function FooterLink({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
    return <a href={href} onClick={onClick} style={{ color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>{children}</a>;
}
