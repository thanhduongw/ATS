import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Checkbox, Input, Radio, Result, Spin } from "antd";
import { CalendarOutlined, CheckCircleFilled, DownloadOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { acceptOffer, declineOffer, getMyOfferPdf, getMyOffers, getOfferById } from "../offerCandidateApi";
import type { ApiMessageResponse, CandidateOfferResponse } from "../types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { getPublicCompany } from "../../public/publicApi";
import { downloadIcs } from "../../interview/ics";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { InlineNotice, Panel, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * C16 · Chi tiết thư mời (dải màu xanh đậm) · C21 chấp nhận kèm ô "Tôi đã đọc và đồng ý" ·
 * C22 từ chối kèm lý do · C23 chào mừng gia nhập sau khi chấp nhận.
 * Lý do từ chối: 5 lựa chọn theo HTML; gửi kèm mã lý do của danh mục "Lý do từ chối" nếu khớp tên
 * (lương, địa điểm), còn lại dùng "Ứng viên tự rút hồ sơ" và ghi lựa chọn vào ghi chú.
 * Tải thư mời PDF ở khung "Phản hồi thư mời" và ở màn chào mừng.
 * Khác HTML: chưa có giờ / địa chỉ cụ thể của ngày đầu tiên.
 */
const WEEKDAY_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const PAY_SUFFIX: Record<string, string> = { MONTHLY: " / tháng", YEARLY: " / năm" };
const DECLINE_CHOICES = [
    { key: "OTHER_OFFER", label: "Đã nhận thư mời khác", match: null },
    { key: "SALARY", label: "Mức lương chưa phù hợp", match: "lương" },
    { key: "LOCATION", label: "Địa điểm / hình thức làm việc", match: "địa điểm" },
    { key: "PERSONAL", label: "Lý do cá nhân", match: null },
    { key: "OTHER", label: "Khác", match: null },
] as const;
type DeclineKey = (typeof DECLINE_CHOICES)[number]["key"];

const longDate = (v: string) => `${WEEKDAY_FULL[dayjs(v).day()]}, ${dayjs(v).format("DD/MM/YYYY")}`;

export default function OfferCandidateViewPage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const fullName = useAppSelector((s) => s.auth.user?.fullName ?? "");
    const firstName = fullName.trim().split(/\s+/).pop() ?? "";

    const [offer, setOffer] = useState<CandidateOfferResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<"forbidden" | "notfound" | null>(null);
    const [company, setCompany] = useState<string>("");
    const [locations, setLocations] = useState<CatalogItem[]>([]);
    const [reasons, setReasons] = useState<CatalogItem[]>([]);
    const [acceptOpen, setAcceptOpen] = useState(false);
    const [agree, setAgree] = useState(false);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineKey, setDeclineKey] = useState<DeclineKey | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const byApplication = location.pathname.startsWith("/offers/candidate/");
            const r = byApplication ? await getMyOffers(Number(id)) : await getOfferById(Number(id));
            const loaded = Array.isArray(r.data) ? r.data[0] : r.data;
            if (!loaded) setError("notfound");
            else { setOffer(loaded); setError(null); }
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            if (e.response?.status === 403) setError("forbidden");
            else if (e.response?.status === 404) setError("notfound");
            else message.error(e.response?.data?.message ?? "Không tải được thư mời nhận việc");
        } finally { setLoading(false); }
    }, [id, location.pathname, message]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        getPublicCompany().then((r) => setCompany(r.data.name)).catch(() => undefined);
        getCatalogItems("/masterdata/work-locations").then((r) => setLocations(r.data)).catch(() => undefined);
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data)).catch(() => undefined);
    }, []);

    if (loading) return <div style={{ textAlign: "center", padding: 80 }}><Spin /></div>;
    if (error === "forbidden") return <Result status="403" title="Không có quyền" subTitle="Đây không phải thư mời của bạn." />;
    if (error === "notfound" || !offer) return <Result status="404" title="Không tìm thấy" subTitle="Thư mời không tồn tại hoặc đã bị xoá." />;

    const deadline = offer.responseDeadline ? dayjs(offer.responseDeadline) : null;
    const expired = offer.status === "EXPIRED" || (offer.status === "APPROVED" && !!deadline && deadline.endOf("day").isBefore(dayjs()));
    const pending = offer.status === "APPROVED" && !expired;
    const daysLeft = deadline ? deadline.startOf("day").diff(dayjs().startOf("day"), "day") : null;
    const workplace = offer.workLocationId != null ? String(locations.find((l) => l.id === offer.workLocationId)?.name ?? "") : "";
    const pay = PAY_SUFFIX[offer.payFrequency ?? "MONTHLY"] ?? "";
    const benefits = (offer.benefits ?? "").split(/\n|;|,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);

    const downloadPdf = async () => {
        setDownloading(true);
        try {
            const res = await getMyOfferPdf(offer.id);
            saveAs(res.data, `thu-moi-${(offer.jobTitle ?? "nhan-viec").replace(/[\\/:*?"<>|]/g, "-")}.pdf`);
        } catch {
            message.error("Không tải được thư mời PDF, vui lòng thử lại");
        } finally { setDownloading(false); }
    };

    const accept = async () => {
        setBusy(true);
        try {
            await acceptOffer(offer.id);
            setAcceptOpen(false);
            await load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không chấp nhận được thư mời");
        } finally { setBusy(false); }
    };

    const decline = async () => {
        const choice = DECLINE_CHOICES.find((c) => c.key === declineKey);
        if (!choice) return;
        const matched = choice.match ? reasons.find((r) => String(r.name).toLowerCase().includes(choice.match!)) : undefined;
        const fallback = reasons.find((r) => String(r.name).toLowerCase().includes("tự rút"));
        const reasonId = matched?.id ?? fallback?.id;
        if (reasonId == null) { message.error("Chưa tải được danh mục lý do, vui lòng thử lại"); return; }
        setBusy(true);
        try {
            await declineOffer(offer.id, {
                declineReasonId: reasonId,
                note: [matched ? null : choice.label, note.trim() || null].filter(Boolean).join(": ") || null,
            });
            setDeclineOpen(false);
            message.success("Đã gửi phản hồi từ chối");
            await load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không từ chối được thư mời");
        } finally { setBusy(false); }
    };

    // C23 · Chào mừng gia nhập.
    if (offer.status === "ACCEPTED") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
                <Band
                    eyebrow="CHÀO MỪNG"
                    title={`Chào mừng ${firstName || "bạn"} đến với ${company || "công ty"}!`}
                    subtitle={offer.jobTitle ?? ""}
                />
                <Panel>
                    <Row label="Ngày đầu tiên" value={longDate(offer.startDate)} />
                    {workplace && <Row label="Địa điểm" value={workplace} />}
                    {offer.reportingManager && <Row label="Người đón bạn" value={offer.reportingManager} />}
                    <Row label="Mang theo" value="CCCD · Sổ bảo hiểm (nếu có) · Thông tin tài khoản ngân hàng" />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Button icon={<CalendarOutlined />} onClick={() => downloadIcs({
                            uid: `offer-${offer.id}`, title: `Ngày đầu tiên · ${offer.jobTitle ?? ""}`,
                            start: dayjs(offer.startDate).hour(8).minute(30).toISOString(), durationMinutes: 60, location: workplace || null,
                        })}>Thêm vào lịch</Button>
                        <Button icon={<DownloadOutlined />} loading={downloading} onClick={downloadPdf}>Tải thư mời PDF</Button>
                        <Button type="primary" onClick={() => navigate("/my-home")}>Về trang tổng quan</Button>
                    </div>
                </Panel>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
            <PageBreadcrumb crumb={offer.jobTitle ?? "Thư mời nhận việc"} />
            <Band
                eyebrow="THƯ MỜI NHẬN VIỆC"
                title={`Chúc mừng ${firstName || "bạn"}!`}
                subtitle={offer.jobTitle ?? ""}
                aside={deadline && offer.status === "APPROVED" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>Hạn phản hồi {deadline.format("DD/MM/YYYY")}</span>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>
                            {expired ? "Đã hết hạn" : daysLeft === 0 ? "Hôm nay" : `Còn ${daysLeft} ngày`}
                        </span>
                    </div>
                ) : undefined}
            />

            {offer.status === "DECLINED" && (
                <InlineNotice tone="neutral">
                    Bạn đã từ chối thư mời này{offer.declineReasonName ? ` · ${offer.declineReasonName}` : ""}. Cảm ơn bạn đã phản hồi.
                </InlineNotice>
            )}
            {expired && <InlineNotice tone="warning">Thư mời đã hết hạn phản hồi. Liên hệ bộ phận tuyển dụng nếu bạn vẫn quan tâm.</InlineNotice>}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Panel title="Điều khoản chính" bodyGap={0}>
                        <Row label="Lương gộp" value={`${formatMoney(offer.salaryOffered)}${pay}`} strong />
                        {offer.allowance != null && <Row label="Phụ cấp" value={`${formatMoney(offer.allowance)}${pay}`} />}
                        {offer.performanceBonus && <Row label="Thưởng hiệu suất" value={offer.performanceBonus} />}
                        <Row label="Ngày bắt đầu" value={longDate(offer.startDate)} />
                        <Row label="Thử việc" value={`${offer.probationMonths} tháng`} />
                        <Row label="Loại hợp đồng" value={offer.contractTypeName} />
                        {workplace && <Row label="Nơi làm việc" value={workplace} />}
                        {offer.reportingManager && <Row label="Báo cáo cho" value={offer.reportingManager} />}
                        {offer.annualLeaveDays != null && <Row label="Nghỉ phép" value={`${offer.annualLeaveDays} ngày / năm`} />}
                    </Panel>
                    {benefits.length > 0 && (
                        <Panel title="Phúc lợi">
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {benefits.map((b) => (
                                    <span key={b} style={{ padding: "6px 12px", borderRadius: 14, background: COLORS.fill, fontSize: 13 }}>{b}</span>
                                ))}
                            </div>
                        </Panel>
                    )}
                    {offer.candidateVisibleNote && (
                        <Panel title="Lời nhắn">
                            <span style={{ whiteSpace: "pre-wrap", color: COLORS.textSecondary }}>{offer.candidateVisibleNote}</span>
                        </Panel>
                    )}
                </div>

                <Panel title="Phản hồi thư mời">
                    {pending ? (<>
                        <Button type="primary" size="large" block onClick={() => { setAgree(false); setAcceptOpen(true); }}>Chấp nhận thư mời</Button>
                        <Button size="large" block onClick={() => { setDeclineKey(null); setNote(""); setDeclineOpen(true); }}>Từ chối</Button>
                    </>) : (
                        <StatusTag
                            label={offer.status === "DECLINED" ? "Đã từ chối" : expired ? "Đã hết hạn" : "Chưa sẵn sàng"}
                            tone={offer.status === "DECLINED" ? "neutral" : "warning"}
                        />
                    )}
                    <Button type="link" icon={<DownloadOutlined />} loading={downloading} onClick={downloadPdf}
                        style={{ alignSelf: "center" }}>Tải thư mời (PDF)</Button>
                </Panel>
            </div>

            <SmallDialog
                open={acceptOpen}
                title="Chấp nhận thư mời?"
                okText="Chấp nhận"
                okDisabled={!agree}
                okLoading={busy}
                onCancel={() => setAcceptOpen(false)}
                onOk={accept}
            >
                <div>
                    <Row label="Vị trí" value={offer.jobTitle ?? "—"} />
                    <Row label="Lương gộp" value={`${formatMoney(offer.salaryOffered)}${pay}`} />
                    <Row label="Ngày bắt đầu" value={dayjs(offer.startDate).format("DD/MM/YYYY")} />
                </div>
                <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}>
                    Tôi đã đọc và đồng ý với điều khoản trong thư mời
                </Checkbox>
            </SmallDialog>

            <SmallDialog
                open={declineOpen}
                title="Từ chối thư mời"
                okText="Xác nhận từ chối"
                danger
                okDisabled={!declineKey}
                okLoading={busy}
                onCancel={() => setDeclineOpen(false)}
                onOk={decline}
            >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Lý do</span>
                <Radio.Group value={declineKey} onChange={(e) => setDeclineKey(e.target.value)}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                    options={DECLINE_CHOICES.map((c) => ({ value: c.key, label: c.label }))} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Ghi chú (không bắt buộc)</span>
                <Input.TextArea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </SmallDialog>
        </div>
    );
}

/** Dải màu xanh đậm đầu thư mời (C16). */
function Band({ eyebrow, title, subtitle, aside }: { eyebrow: string; title: string; subtitle: string; aside?: React.ReactNode }) {
    return (
        <section style={{
            borderRadius: 20, padding: "24px 28px", color: "#fff",
            background: "linear-gradient(135deg, #0A3FB8 0%, #0A59F7 100%)",
            display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, letterSpacing: "0.08em", opacity: 0.8 }}>{eyebrow}</span>
                <span style={{ fontSize: 26, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {eyebrow === "CHÀO MỪNG" && <CheckCircleFilled />}{title}
                </span>
                {subtitle && <span style={{ fontSize: 14, opacity: 0.9 }}>{subtitle}</span>}
            </div>
            {aside}
        </section>
    );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div style={{ display: "flex", gap: 16, padding: "9px 0", borderTop: `0.5px solid ${COLORS.border}` }}>
            <span style={{ width: 150, flexShrink: 0, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ fontWeight: strong ? 700 : 500 }}>{value}</span>
        </div>
    );
}
