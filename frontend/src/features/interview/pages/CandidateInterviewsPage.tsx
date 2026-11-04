import { useState } from "react";
import { App, Button, Calendar, Segmented, Spin } from "antd";
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { confirmInterview } from "../interviewApi";
import type { ApiMessageResponse, CandidateInterviewResponse } from "../types";
import { downloadIcs } from "../ics";
import { COLORS, type StatusTone } from "../../../app/theme";
import { InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import EmptyState from "../../../components/ui/EmptyState";
import { awaitingReply, canDecline, needsConfirm, useCandidatePortal } from "../../candidate/useCandidatePortal";
import CandidateDeclineDialog from "../components/CandidateDeclineDialog";

/**
 * C14 · Lịch phỏng vấn — danh sách (Sắp tới · Đã diễn ra) và C26 dạng tháng.
 * Lịch 1 giờ cố định (04/11/2026): ứng viên chỉ "Đồng ý" hoặc "Từ chối" (xin dời lịch kèm lý do / không tham
 * gia nữa = rút đơn) — không chọn khung giờ, không tự đề xuất giờ.
 * Nút "Thêm vào lịch" tải file .ics; "Vào phòng họp" chỉ hiện với buổi trực tuyến đã xác nhận.
 */
type View = "LIST" | "MONTH";

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
};

export default function CandidateInterviewsPage() {
    const { message } = App.useApp();
    const { loading, failed, applications, interviews, offers, reload } = useCandidatePortal();
    const [view, setView] = useState<View>("LIST");
    const [confirmingId, setConfirmingId] = useState<number>();
    const [declining, setDeclining] = useState<CandidateInterviewResponse | null>(null);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;

    const titleOf = (applicationId: number) => applications.find((a) => a.id === applicationId)?.jobTitle ?? "Phỏng vấn";
    const now = dayjs();
    const endOf = (iv: CandidateInterviewResponse) => dayjs(iv.scheduledAt).add(iv.durationMinutes ?? 60, "minute");
    const upcoming = interviews
        .filter((iv) => iv.status in UPCOMING_STATUS && endOf(iv).isAfter(now))
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf());
    const past = interviews
        .filter((iv) => !upcoming.includes(iv))
        .sort((a, b) => dayjs(b.scheduledAt).valueOf() - dayjs(a.scheduledAt).valueOf());

    const confirm = async (id: number) => {
        setConfirmingId(id);
        try {
            await confirmInterview(id);
            message.success("Đã đồng ý lịch phỏng vấn");
            reload();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không xác nhận được lịch phỏng vấn");
        } finally { setConfirmingId(undefined); }
    };

    const ics = (iv: CandidateInterviewResponse) => downloadIcs({
        uid: `interview-${iv.id}`, title: `Phỏng vấn · ${titleOf(iv.applicationId)}`, start: iv.scheduledAt,
        durationMinutes: iv.durationMinutes ?? 60,
        location: iv.format === "ONLINE" ? iv.meetingLink ?? "Trực tuyến" : "Tại văn phòng",
        description: iv.interviewerNames.length ? `Người phỏng vấn: ${iv.interviewerNames.join(", ")}` : null,
    });

    const empty = !failed && upcoming.length === 0 && past.length === 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
            <ScreenTitle
                title="Lịch phỏng vấn"
                actions={<Segmented<View> value={view} onChange={setView}
                    options={[{ value: "LIST", label: "Danh sách" }, { value: "MONTH", label: "Lịch tháng" }]} />}
            />
            {failed && (
                <InlineNotice tone="danger" action={<Button onClick={reload}>Thử lại</Button>}>
                    Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.
                </InlineNotice>
            )}
            {empty && <Panel><EmptyState title="Bạn chưa có lịch phỏng vấn nào" /></Panel>}

            {view === "LIST" && !empty && (<>
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
                                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                            {days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`}
                                        </span>
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: 16 }}>Phỏng vấn · {titleOf(iv.applicationId)}</span>
                                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                        {d.format("HH:mm")} – {endOf(iv).format("HH:mm")}
                                        {" · "}{iv.format === "ONLINE" ? <><VideoCameraOutlined /> Trực tuyến</> : <><EnvironmentOutlined /> Tại văn phòng</>}
                                    </span>
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
                                        <Button type="primary" loading={confirmingId === iv.id} onClick={() => confirm(iv.id)}>Đồng ý</Button>
                                    )}
                                    {iv.status === "CANDIDATE_CONFIRMED" && iv.format === "ONLINE" && iv.meetingLink && (
                                        <Button type="primary" href={iv.meetingLink} target="_blank" rel="noreferrer">Vào phòng họp</Button>
                                    )}
                                    {iv.status !== "CANDIDATE_DECLINED" && (
                                        <Button icon={<CalendarOutlined />} onClick={() => ics(iv)}>Thêm vào lịch</Button>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    );
                })}

                {past.length > 0 && <SectionTitle>Đã diễn ra</SectionTitle>}
                {past.length > 0 && (
                    <Panel bodyGap={0}>
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
            </>)}

            {declining && (
                <CandidateDeclineDialog
                    open
                    interviewId={declining.id}
                    applicationId={declining.applicationId}
                    jobTitle={titleOf(declining.applicationId)}
                    when={dayjs(declining.scheduledAt).format("HH:mm, DD/MM/YYYY")}
                    onClose={() => setDeclining(null)}
                    onDone={reload}
                />
            )}

            {view === "MONTH" && (
                <Panel>
                    <Calendar
                        fullscreen
                        cellRender={(date: Dayjs, info) => {
                            if (info.type !== "date") return info.originNode;
                            const items: { key: string; text: string; color: string }[] = [
                                ...interviews.filter((iv) => iv.status !== "CANCELLED" && iv.status !== "CANDIDATE_DECLINED" && dayjs(iv.scheduledAt).isSame(date, "day"))
                                    .map((iv) => ({ key: `iv${iv.id}`, text: `${dayjs(iv.scheduledAt).format("HH:mm")} Phỏng vấn`, color: COLORS.primary })),
                                ...offers.filter((o) => awaitingReply(o) && o.responseDeadline && dayjs(o.responseDeadline).isSame(date, "day"))
                                    .map((o) => ({ key: `of${o.id}`, text: "Hạn phản hồi thư mời", color: COLORS.warning })),
                            ];
                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    {items.map((it) => (
                                        <span key={it.key} style={{
                                            fontSize: 11, padding: "1px 6px", borderRadius: 6, color: it.color,
                                            background: COLORS.fill, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                        }}>{it.text}</span>
                                    ))}
                                </div>
                            );
                        }}
                    />
                </Panel>
            )}
        </div>
    );
}

function SectionTitle({ children }: { children: string }) {
    return <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginTop: 4 }}>{children}</span>;
}

function DateBlock({ d }: { d: Dayjs }) {
    return (
        <div style={{
            width: 64, flexShrink: 0, borderRadius: 14, background: COLORS.primarySoft, color: COLORS.primary,
            display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0",
        }}>
            <span style={{ fontSize: 10, fontWeight: 600 }}>THÁNG {d.format("M")}</span>
            <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{d.format("DD")}</span>
            <span style={{ fontSize: 10 }}>{["CN", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.day()]}</span>
        </div>
    );
}
