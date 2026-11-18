import { useEffect, useState } from "react";
import { App, Button, Spin } from "antd";
import { CalendarOutlined, CheckCircleOutlined, DownloadOutlined, EnvironmentOutlined, LeftOutlined, TeamOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { confirmInterview } from "../interviewApi";
import type { ApiMessageResponse, CandidateInterviewResponse } from "../types";
import { downloadIcs } from "../ics";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { COLORS, type StatusTone } from "../../../app/theme";
import { Panel, ScreenTitle } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { CandidateEmpty, CandidateLoadError } from "../../candidate/components/CandidateState";
import { canDecline, needsConfirm, useCandidatePortal } from "../../candidate/useCandidatePortal";
import CandidateDeclineDialog from "../components/CandidateDeclineDialog";
import { useCandidateShell } from "../../../layouts/candidateShell";

/**
 * C14 · Lịch phỏng vấn — danh sách (Sắp tới · Đã diễn ra). Bỏ C26 dạng tháng (quyết định 13/11/2026).
 * Lịch 1 giờ cố định (04/11/2026): ứng viên chỉ "Đồng ý" hoặc "Từ chối" (xin dời lịch kèm lý do / không tham
 * gia nữa = rút đơn) — không chọn khung giờ, không tự đề xuất giờ.
 * Nút "Thêm vào lịch" tải file .ics; "Vào phòng họp" chỉ hiện với buổi trực tuyến đã xác nhận.
 * C24 · Đồng ý xong hiện màn "Đã xác nhận lịch phỏng vấn" (giờ, hình thức, người phỏng vấn, .ics) thay cho danh sách.
 * C13/C25 (ứng viên chọn khung giờ, hết hạn chọn giờ) không làm — lịch cố định.
 */
const UPCOMING_STATUS: Record<string, { label: string; tone: StatusTone }> = {
    SCHEDULED: { label: "Chờ chốt giờ", tone: "warning" },
    HM_RESCHEDULE_PROPOSED: { label: "Đang đổi giờ", tone: "warning" },
    HM_CONFIRMED: { label: "Chờ bạn trả lời", tone: "brand" },
    CANDIDATE_CONFIRMED: { label: "Đã đồng ý", tone: "success" },
    CANDIDATE_DECLINED: { label: "Đã xin dời · chờ lịch mới", tone: "warning" },
};
const PAST_STATUS: Record<string, { label: string; tone: StatusTone }> = {
    COMPLETED: { label: "Đã hoàn thành", tone: "success" },
    EVALUATION_PENDING: { label: "Đã hoàn thành", tone: "success" },
    NO_SHOW: { label: "Vắng mặt", tone: "danger" },
    CANCELLED: { label: "Đã huỷ", tone: "neutral" },
    EXPIRED: { label: "Hết hạn", tone: "neutral" },
};
/** Buổi không diễn ra — tách khỏi nhóm "Đã diễn ra". */
const NOT_HELD = new Set(["CANCELLED", "EXPIRED"]);

export default function CandidateInterviewsPage() {
    const { message } = App.useApp();
    const { loading, failed, applications, interviews, reload } = useCandidatePortal();
    const [confirmingId, setConfirmingId] = useState<number>();
    const [declining, setDeclining] = useState<CandidateInterviewResponse | null>(null);
    const [confirmed, setConfirmed] = useState<CandidateInterviewResponse | null>(null);
    const shell = useCandidateShell();
    const reloadAll = () => { reload(); shell?.refreshBadges(); };
    /** Văn phòng (tên + địa chỉ) để ứng viên biết đến đâu. */
    const [places, setPlaces] = useState<Record<number, string>>({});
    useEffect(() => {
        getCatalogItems("/masterdata/work-locations")
            .then((r) => setPlaces(Object.fromEntries(r.data.map((w) => [
                w.id, [w.name, (w as { address?: string | null }).address].filter(Boolean).join(" — "),
            ]))))
            .catch(() => undefined);
    }, []);
    const placeOf = (iv: CandidateInterviewResponse) =>
        (iv.workLocationId != null ? places[iv.workLocationId] : null) || "Tại văn phòng";

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const titleOf = (applicationId: number) => applications.find((a) => a.id === applicationId)?.jobTitle ?? "Phỏng vấn";
    const now = dayjs();
    const endOf = (iv: CandidateInterviewResponse) => dayjs(iv.scheduledAt).add(iv.durationMinutes ?? 60, "minute");
    const upcoming = interviews
        .filter((iv) => iv.status in UPCOMING_STATUS && endOf(iv).isAfter(now))
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf());
    const rest = interviews
        .filter((iv) => !upcoming.includes(iv))
        .sort((a, b) => dayjs(b.scheduledAt).valueOf() - dayjs(a.scheduledAt).valueOf());
    const past = rest.filter((iv) => !NOT_HELD.has(iv.status));
    const cancelled = rest.filter((iv) => NOT_HELD.has(iv.status));

    const confirm = async (iv: CandidateInterviewResponse) => {
        setConfirmingId(iv.id);
        try {
            await confirmInterview(iv.id);
            setConfirmed(iv);
            window.scrollTo({ top: 0 });
            reloadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không xác nhận được lịch phỏng vấn");
        } finally { setConfirmingId(undefined); }
    };

    const ics = (iv: CandidateInterviewResponse) => downloadIcs({
        uid: `interview-${iv.id}`, title: `Phỏng vấn · ${titleOf(iv.applicationId)}`, start: iv.scheduledAt,
        durationMinutes: iv.durationMinutes ?? 60,
        location: iv.format === "ONLINE" ? iv.meetingLink ?? "Trực tuyến" : placeOf(iv),
        description: iv.interviewerNames.length ? `Người phỏng vấn: ${iv.interviewerNames.join(", ")}` : null,
    });

    const empty = !failed && upcoming.length === 0 && rest.length === 0;
    // Lỗi tải: chỉ báo lỗi, không vẽ danh sách rỗng (C33).

    // C24 · Đã xác nhận lịch phỏng vấn.
    if (confirmed) {
        const d = dayjs(confirmed.scheduledAt);
        const online = confirmed.format === "ONLINE";
        const fact = (icon: React.ReactNode, text: string) => (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: COLORS.primary, display: "inline-flex" }}>{icon}</span>{text}</span>
        );
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <a onClick={() => setConfirmed(null)} style={{ alignSelf: "flex-start", fontSize: 14, color: COLORS.textSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <LeftOutlined style={{ fontSize: 11 }} /> Lịch phỏng vấn
                </a>
                <Panel>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "32px 0", textAlign: "center" }}>
                        <span style={{
                            width: 80, height: 80, borderRadius: 24, background: COLORS.successBg, color: COLORS.success,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                        }}><CheckCircleOutlined /></span>
                        <b style={{ fontSize: 26, letterSpacing: "-0.01em" }}>Đã xác nhận lịch phỏng vấn</b>
                        <div style={{
                            width: "100%", maxWidth: 480, background: COLORS.fill, borderRadius: 16, padding: "16px 20px",
                            display: "flex", flexDirection: "column", gap: 10, textAlign: "left", fontSize: 15,
                        }}>
                            {fact(<CalendarOutlined />, `${["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.day()]}, ${d.format("DD/MM/YYYY")} · ${d.format("HH:mm")} – ${endOf(confirmed).format("HH:mm")}`)}
                            {fact(online ? <VideoCameraOutlined /> : <EnvironmentOutlined />, online ? `Trực tuyến${confirmed.meetingLink ? ` · ${confirmed.meetingLink.replace(/^https?:\/\//, "")}` : ""}` : placeOf(confirmed))}
                            {confirmed.interviewerNames.length > 0 && fact(<TeamOutlined />, confirmed.interviewerNames.join(", "))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                            <Button size="large" icon={<DownloadOutlined />} onClick={() => ics(confirmed)} style={{ color: COLORS.primary }}>Thêm vào lịch (.ics)</Button>
                            <Button size="large" type="primary" onClick={() => setConfirmed(null)}>Về lịch phỏng vấn</Button>
                        </div>
                    </div>
                </Panel>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle title="Lịch phỏng vấn" />
            {failed && <Panel><CandidateLoadError onRetry={reload} /></Panel>}
            {empty && <Panel><CandidateEmpty icon={<CalendarOutlined />} title="Bạn chưa có lịch phỏng vấn nào"
                description="Khi bộ phận tuyển dụng gửi lịch, bạn sẽ thấy ở đây và nhận thông báo." /></Panel>}

            {!empty && (<>
                {upcoming.length > 0 && <SectionTitle>Sắp tới</SectionTitle>}
                {upcoming.map((iv) => {
                    const d = dayjs(iv.scheduledAt);
                    const st = UPCOMING_STATUS[iv.status];
                    const days = d.startOf("day").diff(now.startOf("day"), "day");
                    const names = iv.interviewerNames;
                    return (
                        <Panel key={iv.id}>
                            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <DateBlock d={d} />
                                <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <StatusTag {...st} />
                                        <StatusTag label={days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`} tone="warning" />
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: 16 }}>Phỏng vấn · {titleOf(iv.applicationId)}</span>
                                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                        {d.format("HH:mm")} – {endOf(iv).format("HH:mm")}
                                        {" · "}{iv.format === "ONLINE" ? <><VideoCameraOutlined /> Trực tuyến</> : <><EnvironmentOutlined /> Tại văn phòng</>}
                                    </span>
                                    {iv.format === "ONLINE"
                                        ? iv.meetingLink && (
                                            <span style={{ fontSize: 13 }}>
                                                <a href={iv.meetingLink.startsWith("http") ? iv.meetingLink : `https://${iv.meetingLink}`} target="_blank" rel="noreferrer">
                                                    {iv.meetingLink.replace(/^https?:\/\//, "")}
                                                </a>
                                            </span>
                                        )
                                        : iv.workLocationId != null && places[iv.workLocationId] && (
                                            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{places[iv.workLocationId]}</span>
                                        )}
                                    {names.length > 0 && (
                                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                            <TeamOutlined /> {names[0]}{names.length > 1 ? ` + ${names.length - 1}` : ""}
                                        </span>
                                    )}
                                    {iv.status === "CANDIDATE_DECLINED" && iv.candidateDeclineReason && (
                                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Lý do bạn gửi: “{iv.candidateDeclineReason}”</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {canDecline(iv) && (
                                        <Button danger onClick={() => setDeclining(iv)}>Từ chối</Button>
                                    )}
                                    {needsConfirm(iv) && (
                                        <Button type="primary" loading={confirmingId === iv.id} onClick={() => confirm(iv)}>Đồng ý</Button>
                                    )}
                                    {iv.status === "CANDIDATE_CONFIRMED" && iv.format === "ONLINE" && iv.meetingLink && (
                                        <Button type="primary" href={iv.meetingLink.startsWith("http") ? iv.meetingLink : `https://${iv.meetingLink}`} target="_blank" rel="noreferrer">Vào phòng họp</Button>
                                    )}
                                    {iv.status !== "CANDIDATE_DECLINED" && (
                                        <Button icon={<CalendarOutlined />} onClick={() => ics(iv)}>Thêm vào lịch</Button>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    );
                })}

                {past.length > 0 && (
                    <Panel title="Đã diễn ra" bodyGap={0}>
                        {past.map((iv, i) => {
                            const st = PAST_STATUS[iv.status] ?? { label: "Đã diễn ra", tone: "neutral" as StatusTone };
                            return (
                                <div key={iv.id} style={{
                                    display: "flex", alignItems: "center", gap: 16, padding: "12px 0",
                                    borderTop: i ? `0.5px solid ${COLORS.border}` : undefined,
                                }}>
                                    <span style={{ width: 90, color: COLORS.textSecondary, fontSize: 13 }}>{dayjs(iv.scheduledAt).format("DD/MM/YYYY")}</span>
                                    <span style={{ flex: 1 }}>Phỏng vấn · {titleOf(iv.applicationId)}</span>
                                    <StatusTag {...st} />
                                </div>
                            );
                        })}
                    </Panel>
                )}
                {cancelled.length > 0 && (
                    <Panel title="Đã huỷ" bodyGap={0}>
                        {cancelled.map((iv, i) => {
                            const st = PAST_STATUS[iv.status] ?? { label: "Đã diễn ra", tone: "neutral" as StatusTone };
                            return (
                                <div key={iv.id} style={{
                                    display: "flex", alignItems: "center", gap: 16, padding: "12px 0",
                                    borderTop: i ? `0.5px solid ${COLORS.border}` : undefined,
                                }}>
                                    <span style={{ width: 90, color: COLORS.textSecondary, fontSize: 13 }}>{dayjs(iv.scheduledAt).format("DD/MM/YYYY")}</span>
                                    <span style={{ flex: 1 }}>Phỏng vấn · {titleOf(iv.applicationId)}</span>
                                    <StatusTag {...st} />
                                </div>
                            );
                        })}
                    </Panel>
                )}
            </>)}

            {declining && (
                <CandidateDeclineDialog
                    open
                    interviewId={declining.id}
                    applicationId={declining.applicationId}
                    jobTitle={titleOf(declining.applicationId)}
                    when={dayjs(declining.scheduledAt).format("HH:mm, DD/MM/YYYY")}
                    onClose={() => setDeclining(null)}
                    onDone={reloadAll}
                />
            )}

        </div>
    );
}

function SectionTitle({ children }: { children: string }) {
    return <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, marginTop: 4 }}>{children}</span>;
}

function DateBlock({ d }: { d: Dayjs }) {
    return (
        <div style={{
            width: 64, flexShrink: 0, borderRadius: 14, background: COLORS.primary, color: COLORS.textOnDark,
            display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0",
        }}>
            <span style={{ fontSize: 10, fontWeight: 600 }}>THÁNG {d.format("M")}</span>
            <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{d.format("DD")}</span>
            <span style={{ fontSize: 10 }}>{["CN", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.day()]}</span>
        </div>
    );
}
