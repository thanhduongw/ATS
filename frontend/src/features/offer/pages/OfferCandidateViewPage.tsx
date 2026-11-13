import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Checkbox, Input, Radio, Result, Spin } from "antd";
import {
    CalendarOutlined, CheckCircleFilled, CheckCircleOutlined, CheckOutlined, ClockCircleOutlined, CoffeeOutlined, CreditCardOutlined,
    DownloadOutlined, EnvironmentOutlined, FileTextOutlined, LeftOutlined, RiseOutlined, RocketOutlined, UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
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
import { COLORS, GRADIENTS, SHADOWS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { InlineNotice, Panel, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";

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

    // C23 · Chào mừng gia nhập: dải xanh (icon tên lửa, lời chào), thẻ 3 cột + "Mang theo", nút căn giữa.
    if (offer.status === "ACCEPTED") {
        const bring = ["CCCD", "Sổ bảo hiểm (nếu có)", "Thông tin tài khoản ngân hàng"];
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                <div style={{
                    width: "100%", borderRadius: 24, background: GRADIENTS.hero, color: COLORS.textOnDark, textAlign: "center",
                    padding: "40px 24px 96px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                }}>
                    <span style={{
                        // Ô icon trên nền xanh đậm: trắng mờ 14% (một lần, cùng giá trị chip ở C03).
                        width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.14)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                    }}><RocketOutlined /></span>
                    <b style={{ fontSize: 32, letterSpacing: "-0.01em" }}>Chào mừng {firstName || "bạn"} đến với {company || "công ty"}!</b>
                    <span style={{ opacity: 0.85, fontSize: 15 }}>{offer.jobTitle ?? ""}</span>
                </div>
                <section style={{
                    width: "calc(100% - 48px)", marginTop: -64, background: COLORS.cardBg, borderRadius: 20, padding: 24,
                    display: "flex", flexDirection: "column", gap: 16, boxShadow: SHADOWS.dropdown,
                }}>
                    <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                        <WelcomeFact icon={<CalendarOutlined />} label="Ngày đầu tiên" value={longDate(offer.startDate)} />
                        {workplace && <WelcomeFact icon={<EnvironmentOutlined />} label="Địa điểm" value={workplace} />}
                        {offer.reportingManager && <WelcomeFact icon={<UserOutlined />} label="Người đón bạn" value={offer.reportingManager} />}
                    </div>
                    <div style={{ borderTop: `0.5px solid ${COLORS.border}` }} />
                    <b>Mang theo</b>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {bring.map((x) => (
                            <span key={x} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 14, background: COLORS.fill, fontSize: 13 }}>
                                <CheckCircleOutlined style={{ color: COLORS.textSecondary }} />{x}
                            </span>
                        ))}
                    </div>
                </section>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
                    <Button size="large" icon={<CalendarOutlined />} onClick={() => downloadIcs({
                        uid: `offer-${offer.id}`, title: `Ngày đầu tiên · ${offer.jobTitle ?? ""}`,
                        start: dayjs(offer.startDate).hour(8).minute(30).toISOString(), durationMinutes: 60, location: workplace || null,
                    })}>Thêm vào lịch</Button>
                    <Button size="large" icon={<DownloadOutlined />} loading={downloading} onClick={downloadPdf}>Tải thư mời PDF</Button>
                    <Button size="large" type="primary" onClick={() => navigate("/my-home")}>Về trang tổng quan</Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button
                type="button"
                onClick={() => navigate("/my-offers")}
                style={{
                    alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: 0, padding: 0,
                    background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: COLORS.textSecondary,
                }}
            >
                <LeftOutlined style={{ fontSize: 11 }} /> Thư mời nhận việc
            </button>
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

            <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* C16: lưới 2 cột, mỗi điều khoản có ô icon; Phúc lợi là chip có dấu ✓ trong cùng thẻ. */}
                    <Panel title="Điều khoản chính" bodyGap={18}>
                        <div className="cand-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px 24px" }}>
                            <Term icon={<WalletOutlined />} label="Lương gộp" value={`${formatMoney(offer.salaryOffered)}${pay}`} />
                            {offer.allowance != null && <Term icon={<CreditCardOutlined />} label="Phụ cấp" value={`${formatMoney(offer.allowance)}${pay}`} />}
                            {offer.performanceBonus && <Term icon={<RiseOutlined />} label="Thưởng hiệu suất" value={offer.performanceBonus} />}
                            <Term icon={<CalendarOutlined />} label="Ngày bắt đầu" value={longDate(offer.startDate)} />
                            <Term icon={<ClockCircleOutlined />} label="Thử việc" value={`${offer.probationMonths} tháng`} />
                            <Term icon={<FileTextOutlined />} label="Loại hợp đồng" value={offer.contractTypeName} />
                            {workplace && <Term icon={<EnvironmentOutlined />} label="Nơi làm việc" value={workplace} />}
                            {offer.reportingManager && <Term icon={<UserOutlined />} label="Báo cáo cho" value={offer.reportingManager} />}
                            {offer.annualLeaveDays != null && <Term icon={<CoffeeOutlined />} label="Nghỉ phép" value={`${offer.annualLeaveDays} ngày / năm`} />}
                        </div>
                        {benefits.length > 0 && (<>
                            <div style={{ borderTop: `0.5px solid ${COLORS.border}` }} />
                            <b style={{ fontSize: 16 }}>Phúc lợi</b>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {benefits.map((b) => (
                                    <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 14, background: COLORS.fill, fontSize: 13 }}>
                                        <CheckCircleOutlined style={{ color: COLORS.textSecondary }} />{b}
                                    </span>
                                ))}
                            </div>
                        </>)}
                    </Panel>
                    {offer.candidateVisibleNote && (
                        <Panel title="Lời nhắn">
                            <span style={{ whiteSpace: "pre-wrap", color: COLORS.textSecondary }}>{offer.candidateVisibleNote}</span>
                        </Panel>
                    )}
                </div>

                <Panel title="Phản hồi thư mời">
                    {pending ? (<>
                        <Button type="primary" size="large" block icon={<CheckOutlined />} onClick={() => { setAgree(false); setAcceptOpen(true); }}>Chấp nhận thư mời</Button>
                        <Button size="large" block style={{ background: COLORS.errorBg, color: COLORS.error, border: 0 }}
                            onClick={() => { setDeclineKey(null); setNote(""); setDeclineOpen(true); }}>Từ chối</Button>
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
                title={(
                    <span style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <span style={{
                            width: 48, height: 48, borderRadius: 14, background: COLORS.successBg, color: COLORS.success,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                        }}><CheckCircleOutlined /></span>
                        Chấp nhận thư mời?
                    </span>
                )}
                okText="Chấp nhận"
                okDisabled={!agree}
                okLoading={busy}
                onCancel={() => setAcceptOpen(false)}
                onOk={accept}
            >
                {/* C21: tóm tắt trong ô xám — nhãn trái, giá trị phải. */}
                <div style={{ background: COLORS.fill, borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <Summary label="Vị trí" value={offer.jobTitle ?? "—"} />
                    <Summary label="Lương gộp" value={`${formatMoney(offer.salaryOffered)}${pay}`} />
                    <Summary label="Ngày bắt đầu" value={dayjs(offer.startDate).format("DD/MM/YYYY")} />
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

function Term({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: COLORS.primarySoft, color: COLORS.primary,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>{icon}</span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
            </span>
        </div>
    );
}

function WelcomeFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: COLORS.textSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: COLORS.primary }}>{icon}</span>{label}
            </span>
            <b style={{ fontSize: 15 }}>{value}</b>
        </div>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ color: COLORS.textSecondary }}>{label}</span>
            <b style={{ textAlign: "right" }}>{value}</b>
        </div>
    );
}
