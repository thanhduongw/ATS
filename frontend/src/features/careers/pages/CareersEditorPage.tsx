import { useEffect, useRef, useState, type ReactNode } from "react";
import { App, Button, Input, InputNumber, Select, Spin, Switch, Upload } from "antd";
import { DeleteOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getPublicCompany } from "../../public/publicApi";
import { getCareersPage, publishCareersPage, saveCareersDraft, uploadImage, type CareersPageResponse } from "../careersApi";
import {
    BENEFIT_ICONS, BENEFIT_ICON_LABEL, BLOCK_LABEL, BLOCK_ORDER, defaultConfig, parseConfig,
    type BlockKey, type CareersConfig,
} from "../careersConfig";
import BenefitIcon from "../components/BenefitIcon";
import { COLORS, RADIUS } from "../../../app/theme";
import { Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";

/**
 * A09 / A10 · Trang tuyển dụng (Quản trị doanh nghiệp). Quyết định 05/11/2026:
 * - Bản nháp + Xuất bản: mọi thay đổi TỰ LƯU vào bản nháp; trang công khai (C01) chỉ đổi khi bấm "Xuất bản".
 * - 6 khối thứ tự cố định, chỉ bật/tắt. Ảnh tải lên S3 qua auth-service. Biểu tượng phúc lợi chọn từ bộ có sẵn.
 */
type ApiError = AxiosError<{ message?: string }>;
const BLOCK_HINT: Partial<Record<BlockKey, string>> = {
    featured: "Tự động từ việc làm đang tuyển",
    offices: "Từ địa chỉ công ty và nơi làm việc của việc làm",
    footer: "Liên hệ lấy ở Thông tin doanh nghiệp",
};

export default function CareersEditorPage() {
    const { message } = App.useApp();
    const [page, setPage] = useState<CareersPageResponse | null>(null);
    const [config, setConfig] = useState<CareersConfig | null>(null);
    const [block, setBlock] = useState<BlockKey>("hero");
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [confirmPublish, setConfirmPublish] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const dirty = useRef(false);

    useEffect(() => {
        Promise.all([getCareersPage().then((r) => r.data), getPublicCompany().then((r) => r.data).catch(() => null)])
            .then(([p, c]) => {
                setPage(p);
                setSavedAt(p.draftUpdatedAt);
                setConfig(parseConfig(p.draftConfig ?? p.publishedConfig, defaultConfig(c)));
            })
            .catch((e: ApiError) => message.error(e.response?.data?.message ?? "Không tải được trang tuyển dụng"));
    }, [message]);

    // Lưu tự động bản nháp 1 giây sau lần sửa cuối.
    useEffect(() => {
        if (!config || !dirty.current) return;
        const t = setTimeout(() => {
            setSaving(true);
            saveCareersDraft(JSON.stringify(config))
                .then((r) => { setPage(r.data); setSavedAt(r.data.draftUpdatedAt); })
                .catch((e: ApiError) => message.error(e.response?.data?.message ?? "Chưa lưu được bản nháp"))
                .finally(() => setSaving(false));
        }, 1000);
        return () => clearTimeout(t);
    }, [config, message]);

    if (!config || !page) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const update = (fn: (c: CareersConfig) => CareersConfig) => { dirty.current = true; setConfig((c) => (c ? fn(c) : c)); };
    const unpublished = page.hasUnpublishedChanges || !page.publishedAt;

    const publish = async () => {
        setPublishing(true);
        try {
            const r = await publishCareersPage();
            setPage(r.data);
            setConfirmPublish(false);
            message.success("Đã xuất bản trang tuyển dụng");
        } catch (e) {
            message.error((e as ApiError).response?.data?.message ?? "Xuất bản thất bại");
        } finally { setPublishing(false); }
    };

    const subtitle = `Trang công khai tại ${window.location.host}/careers/home · ${
        unpublished ? "có thay đổi chưa xuất bản" : `xuất bản lần cuối ${dayjs(page.publishedAt).format("DD/MM/YYYY")}`}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle
                title="Trang tuyển dụng"
                subtitle={subtitle}
                actions={<>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        {saving ? "Đang lưu…" : savedAt ? `Lưu tự động lúc ${dayjs(savedAt).format("HH:mm")}` : ""}
                    </span>
                    <Button onClick={() => window.open("/careers/home?preview=draft", "_blank")}>Xem trước</Button>
                    <Button type="primary" disabled={!unpublished || saving} onClick={() => setConfirmPublish(true)}>Xuất bản</Button>
                </>}
            />

            <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Các khối trên trang" subtitle="Thứ tự cố định — bật/tắt để ẩn hoặc hiện" bodyGap={4}>
                    {BLOCK_ORDER.map((k) => {
                        const sub = k === "life" ? `${config.life.photos.length} ảnh`
                            : k === "benefits" ? `${config.benefits.items.length} mục` : BLOCK_HINT[k];
                        const on = block === k;
                        return (
                            <div key={k} role="button" tabIndex={0} onClick={() => setBlock(k)}
                                onKeyDown={(e) => { if (e.key === "Enter") setBlock(k); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: RADIUS.md, cursor: "pointer",
                                    background: on ? COLORS.primarySoft : "transparent",
                                }}>
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600, color: on ? COLORS.primary : COLORS.textPrimary }}>{BLOCK_LABEL[k]}</span>
                                    {sub && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{config.visible[k] ? sub : "Đang ẩn"}</span>}
                                </div>
                                <Switch size="small" checked={config.visible[k]} aria-label={`Hiện khối ${BLOCK_LABEL[k]}`}
                                    onClick={(_, e) => e.stopPropagation()}
                                    onChange={(val) => update((c) => ({ ...c, visible: { ...c.visible, [k]: val } }))} />
                            </div>
                        );
                    })}
                </Panel>

                <Panel title={BLOCK_LABEL[block]} bodyGap={12}>
                    {block === "hero" && <HeroEditor config={config} update={update} />}
                    {block === "featured" && (<>
                        <Field label="Tiêu đề khối"><Input value={config.featured.title} onChange={(e) => update((c) => ({ ...c, featured: { ...c.featured, title: e.target.value } }))} /></Field>
                        <Field label="Số việc làm hiện ra" hint="Ưu tiên việc làm gắn nhãn “Tuyển gấp”, rồi mới nhất">
                            <InputNumber min={1} max={9} value={config.featured.count} onChange={(v) => update((c) => ({ ...c, featured: { ...c.featured, count: v ?? 3 } }))} />
                        </Field>
                    </>)}
                    {block === "life" && <LifeEditor config={config} update={update} />}
                    {block === "benefits" && <BenefitsEditor config={config} update={update} />}
                    {block === "offices" && (
                        <Field label="Tiêu đề khối" hint="Danh sách văn phòng lấy từ địa chỉ trụ sở (Thông tin doanh nghiệp) và nơi làm việc của các việc làm đang tuyển.">
                            <Input value={config.offices.title} onChange={(e) => update((c) => ({ ...c, offices: { ...c.offices, title: e.target.value } }))} />
                        </Field>
                    )}
                    {block === "footer" && (
                        <span style={{ color: COLORS.textSecondary }}>
                            Chân trang hiện tên công ty, khẩu hiệu, email tuyển dụng, điện thoại và địa chỉ — sửa ở mục Thông tin doanh nghiệp.
                        </span>
                    )}
                </Panel>
            </div>

            <SmallDialog open={confirmPublish} title="Xuất bản trang tuyển dụng?" okText="Xuất bản" okLoading={publishing}
                onCancel={() => setConfirmPublish(false)} onOk={publish}>
                <span style={{ color: COLORS.textSecondary }}>Ứng viên sẽ thấy ngay nội dung mới trên trang tuyển dụng công khai.</span>
            </SmallDialog>
        </div>
    );
}

type Update = (fn: (c: CareersConfig) => CareersConfig) => void;

function HeroEditor({ config, update }: { config: CareersConfig; update: Update }) {
    const h = config.hero;
    const set = (patch: Partial<CareersConfig["hero"]>) => update((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
    return (<>
        <Field label="Ảnh bìa" hint="JPG, tối thiểu 1600 × 900 px, tối đa 5MB">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                    width: 240, aspectRatio: "16 / 9", borderRadius: 12, background: COLORS.fill, flexShrink: 0,
                    backgroundImage: h.coverUrl ? `url(${h.coverUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted,
                }}>{!h.coverUrl && <PictureOutlined style={{ fontSize: 28 }} />}</div>
                <ImageUpload label={h.coverUrl ? "Tải ảnh khác" : "Tải ảnh bìa"} onUploaded={(url) => set({ coverUrl: url })} />
                {h.coverUrl && <Button type="text" danger onClick={() => set({ coverUrl: "" })}>Xoá</Button>}
            </div>
        </Field>
        <Field label="Dòng nhỏ phía trên" hint="“{jobs}” tự thay bằng số vị trí đang mở">
            <Input value={h.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} placeholder="120+ kỹ sư · {jobs} vị trí đang mở" />
        </Field>
        <Field label="Khẩu hiệu" required>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} value={h.tagline} onChange={(e) => set({ tagline: e.target.value })}
                placeholder="Viết phần mềm tử tế cho doanh nghiệp Việt" />
        </Field>
        <Field label="Câu mô tả"><Input value={h.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 12 }}>
            <Field label="Trích dẫn nhân viên"><Input value={h.quote} onChange={(e) => set({ quote: e.target.value })} placeholder="Ngày đầu đã được đưa mã lên hệ thống thật." /></Field>
            <Field label="Người nói"><Input value={h.quoteAuthor} onChange={(e) => set({ quoteAuthor: e.target.value })} placeholder="Họ tên · Vị trí, thâm niên" /></Field>
        </div>
    </>);
}

function LifeEditor({ config, update }: { config: CareersConfig; update: Update }) {
    const photos = config.life.photos;
    const setPhotos = (next: CareersConfig["life"]["photos"]) => update((c) => ({ ...c, life: { ...c.life, photos: next } }));
    return (<>
        <Field label="Tiêu đề khối"><Input value={config.life.title} onChange={(e) => update((c) => ({ ...c, life: { ...c.life, title: e.target.value } }))} /></Field>
        <Field label={`Ảnh (${photos.length}/8)`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {photos.map((p, i) => (
                    <div key={`${p.url}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ position: "relative" }}>
                            <img src={p.url} alt={p.caption || `Ảnh ${i + 1}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12 }} />
                            <Button size="small" shape="circle" icon={<DeleteOutlined />} aria-label="Xoá ảnh"
                                style={{ position: "absolute", top: 6, right: 6 }} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} />
                        </div>
                        <Input size="small" placeholder="Chú thích" value={p.caption}
                            onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                    </div>
                ))}
                {photos.length < 8 && (
                    <div style={{ aspectRatio: "4 / 3", borderRadius: 12, border: `1px dashed ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ImageUpload label="Thêm ảnh" onUploaded={(url) => setPhotos([...photos, { url, caption: "" }])} />
                    </div>
                )}
            </div>
        </Field>
    </>);
}

function BenefitsEditor({ config, update }: { config: CareersConfig; update: Update }) {
    const items = config.benefits.items;
    const setItems = (next: CareersConfig["benefits"]["items"]) => update((c) => ({ ...c, benefits: { ...c.benefits, items: next } }));
    return (<>
        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{items.length} mục · hiển thị dạng lưới 2 cột</span>
        <Field label="Tiêu đề khối">
            <Input value={config.benefits.title} onChange={(e) => update((c) => ({ ...c, benefits: { ...c.benefits, title: e.target.value } }))} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "190px minmax(0, 1fr) minmax(0, 1.2fr) 32px", gap: 8, fontSize: 12, color: COLORS.textSecondary }}>
            <span>Biểu tượng</span><span>Tên phúc lợi</span><span>Mô tả ngắn</span><span />
        </div>
        {items.map((b, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "190px minmax(0, 1fr) minmax(0, 1.2fr) 32px", gap: 8, alignItems: "center" }}>
                <Select value={b.icon} popupMatchSelectWidth={false} onChange={(v) => setItems(items.map((x, j) => (j === i ? { ...x, icon: v } : x)))}
                    options={BENEFIT_ICONS.map((k) => ({
                        value: k,
                        label: <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><BenefitIcon icon={k} size={22} />{BENEFIT_ICON_LABEL[k]}</span>,
                    }))} />
                <Input value={b.title} placeholder="Lương cạnh tranh + tháng 13"
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Input value={b.description} placeholder="Xét tăng lương 2 lần/năm"
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <Button type="text" icon={<DeleteOutlined />} aria-label="Xoá phúc lợi" onClick={() => setItems(items.filter((_, j) => j !== i))} />
            </div>
        ))}
        <Button icon={<PlusOutlined />} style={{ alignSelf: "flex-start", color: COLORS.primary }}
            onClick={() => setItems([...items, { icon: "gift", title: "", description: "" }])}>Thêm phúc lợi</Button>
    </>);
}

function ImageUpload({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);
    return (
        <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false}
            customRequest={async ({ file }) => {
                setBusy(true);
                try {
                    const r = await uploadImage(file as File, "careers");
                    onUploaded(r.data.url);
                } catch (e) {
                    message.error((e as ApiError).response?.data?.message ?? "Không tải được ảnh");
                } finally { setBusy(false); }
            }}>
            <Button loading={busy} icon={<PictureOutlined />}>{label}</Button>
        </Upload>
    );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}{required && <span style={{ color: COLORS.error }}> *</span>}</span>
            {children}
            {hint && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{hint}</span>}
        </div>
    );
}
