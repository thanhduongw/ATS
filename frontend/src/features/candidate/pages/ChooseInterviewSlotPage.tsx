import { useState } from "react";
import { App, Button, Result, Spin } from "antd";
import { CalendarOutlined, CheckCircleFilled } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { confirmSlot } from "../../interview/interviewApi";
import type { InterviewSlotResponse } from "../../interview/types";
import { downloadIcs } from "../../interview/ics";
import type { ApiMessageResponse } from "../types";
import { COLORS } from "../../../app/theme";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { chosenSlot, useCandidatePortal } from "../useCandidatePortal";

/**
 * C13 · Chọn khung giờ phỏng vấn (ứng viên chọn 1 trong các khung HR đề xuất) → C24 thành công kèm "Thêm vào lịch (.ics)".
 * Sau khi chọn, HR chốt khung giờ thành buổi phỏng vấn (InterviewSlotService.selectSlot).
 * C25 · Hết hạn chọn giờ: quá hạn HR đặt ở R18 thì không chọn được, hướng ứng viên liên hệ người phụ trách.
 * Khác HTML: chưa có ô ghi chú của ứng viên (backend chưa lưu).
 */
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function ChooseInterviewSlotPage() {
    const { applicationId } = useParams();
    const appId = Number(applicationId);
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { loading, applications, slotsByApp, reload } = useCandidatePortal();
    const [picked, setPicked] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<InterviewSlotResponse | null>(null);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    const app = applications.find((a) => a.id === appId);
    const slots = (slotsByApp.get(appId) ?? []).slice().sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
    const jobTitle = app?.jobTitle ?? "Phỏng vấn";
    const already = chosenSlot(slots);
    const future = slots.filter((s) => dayjs(s.startTime).isAfter(dayjs()));

    const icsOf = (s: InterviewSlotResponse) => downloadIcs({
        uid: `slot-${s.id}`, title: `Phỏng vấn · ${jobTitle}`, start: s.startTime,
        durationMinutes: dayjs(s.endTime).diff(dayjs(s.startTime), "minute"),
        location: s.format === "ONLINE" ? s.meetingLink ?? "Trực tuyến" : "Tại văn phòng",
    });

    if (done) {
        return (
            <Panel style={{ maxWidth: 560 }}>
                <Result
                    icon={<CheckCircleFilled style={{ color: COLORS.success }} />}
                    title="Đã gửi khung giờ bạn chọn"
                    subTitle={<>
                        {slotText(done, true)}<br />
                        {done.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"}
                        <br />Bộ phận tuyển dụng sẽ chốt lịch và gửi thông báo cho bạn.
                    </>}
                    extra={[
                        <Button key="ics" icon={<CalendarOutlined />} onClick={() => icsOf(done)}>Thêm vào lịch (.ics)</Button>,
                        <Button key="back" type="primary" onClick={() => navigate("/my-interviews")}>Về lịch phỏng vấn</Button>,
                    ]}
                />
            </Panel>
        );
    }

    if (!app || slots.length === 0) {
        return (
            <InlineNotice tone="warning" action={<Button onClick={() => navigate("/my-interviews")}>Về lịch phỏng vấn</Button>}>
                Không có khung giờ nào đang chờ bạn chọn cho đơn này.
            </InlineNotice>
        );
    }

    const submit = async () => {
        const slot = slots.find((s) => s.id === picked);
        if (!slot) return;
        setBusy(true);
        try {
            // Bỏ khung đã chọn trước đó (nếu đổi ý), rồi chọn khung mới.
            if (already && already.id !== slot.id) await confirmSlot(already.id, false);
            await confirmSlot(slot.id, true);
            setDone(slot);
            reload();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không gửi được khung giờ, vui lòng thử lại");
        } finally { setBusy(false); }
    };

    const deadline = slots.find((s) => s.responseDeadline)?.responseDeadline ?? null;
    const hrNote = slots.find((s) => s.note)?.note ?? null;

    // C25 · Hết hạn chọn giờ (chưa chọn khung nào).
    if (deadline && dayjs(deadline).isBefore(dayjs()) && !already) {
        return (
            <Panel style={{ maxWidth: 560 }}>
                <Result
                    status="warning"
                    title="Đã hết hạn chọn giờ"
                    subTitle={`Hạn chọn là ${dayjs(deadline).format("DD/MM HH:mm")}. Liên hệ bộ phận tuyển dụng để được gửi lịch mới.`}
                    extra={<Button type="primary" onClick={() => navigate(`/my-applications/${appId}`)}>Về đơn ứng tuyển</Button>}
                />
            </Panel>
        );
    }

    const byDay = new Map<string, InterviewSlotResponse[]>();
    slots.forEach((s) => {
        const k = dayjs(s.startTime).format("YYYY-MM-DD");
        byDay.set(k, [...(byDay.get(k) ?? []), s]);
    });
    const pickedSlot = slots.find((s) => s.id === picked);
    const first = slots[0];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
            <div>
                <PageBreadcrumb crumb={jobTitle} />
                <ScreenTitle
                    title="Chọn lịch phỏng vấn"
                    subtitle={deadline ? <span style={{ color: COLORS.warning, fontWeight: 600 }}>Hạn chọn: {dayjs(deadline).format("DD/MM HH:mm")}</span> : undefined}
                />
            </div>
            {already && (
                <InlineNotice tone="success">
                    Bạn đã chọn <b>{slotText(already, true)}</b>. Có thể đổi sang khung khác trước khi lịch được chốt.
                </InlineNotice>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Chọn 1 khung giờ" bodyGap={14}>
                    {[...byDay.entries()].map(([day, list]) => (
                        <div key={day} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                            <span style={{ width: 80, flexShrink: 0, paddingTop: 8, fontWeight: 600 }}>
                                {WEEKDAY[dayjs(day).day()]} {dayjs(day).format("DD/MM")}
                            </span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {list.map((s) => {
                                    const past = !dayjs(s.startTime).isAfter(dayjs());
                                    const sel = picked === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            disabled={past}
                                            onClick={() => setPicked(s.id)}
                                            style={{
                                                height: 38, padding: "0 16px", borderRadius: 19, fontFamily: "inherit", fontSize: 14,
                                                cursor: past ? "not-allowed" : "pointer", fontWeight: sel ? 600 : 500,
                                                border: sel ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                                                background: sel ? COLORS.primarySoft : COLORS.cardBg,
                                                color: past ? COLORS.textMuted : sel ? COLORS.primary : COLORS.textPrimary,
                                                textDecoration: past ? "line-through" : undefined,
                                            }}
                                        >
                                            {dayjs(s.startTime).format("HH:mm")} – {dayjs(s.endTime).format("HH:mm")}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {future.length === 0 && (
                        <InlineNotice tone="warning">Các khung giờ đều đã qua. Liên hệ bộ phận tuyển dụng để được gửi lịch mới.</InlineNotice>
                    )}
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        {pickedSlot ? <>Đã chọn: <b style={{ color: COLORS.textPrimary }}>{slotText(pickedSlot, true)}</b></> : "Chưa chọn khung giờ nào"}
                    </span>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button onClick={() => navigate(-1)}>Huỷ</Button>
                        <Button type="primary" disabled={!pickedSlot} loading={busy} onClick={submit}>Xác nhận khung giờ</Button>
                    </div>
                </Panel>

                <Panel title="Phỏng vấn" bodyGap={8}>
                    <span style={{ fontWeight: 600 }}>{jobTitle}</span>
                    <Info label="Thời lượng" value={`${dayjs(first.endTime).diff(dayjs(first.startTime), "minute")} phút`} />
                    <Info label="Hình thức" value={first.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"} />
                    {hrNote && (
                        <div style={{ marginTop: 6, padding: 12, borderRadius: 12, background: COLORS.fill, fontSize: 13, whiteSpace: "pre-wrap" }}>
                            {hrNote}
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}

function slotText(s: InterviewSlotResponse, full = false) {
    const d = dayjs(s.startTime);
    return `${full ? WEEKDAY_FULL[d.day()] : WEEKDAY[d.day()]} ${d.format("DD/MM")} · ${d.format("HH:mm")} – ${dayjs(s.endTime).format("HH:mm")}`;
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ color: COLORS.textSecondary }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}
