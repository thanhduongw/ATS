import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Button, DatePicker, Input, InputNumber, Select, Spin } from "antd";
import { CalendarOutlined, EnvironmentOutlined, LinkOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { saveAs } from "file-saver";
import { useNavigate, useParams } from "react-router-dom";
import {
    approveHmProposal, cancelInterview, confirmInterviewByHm, getInterviewById, getInterviewIcs, getInterviews,
    markInterviewNoShow, rejectHmProposal, rejectInterviewByHm, updateInterview, updateInterviewers,
} from "../interviewApi";
import { INTERVIEW_HELD, type ApiMessageResponse, type InterviewResponse } from "../types";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";
import { getPostingById } from "../../recruitment/recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, type StatusTone } from "../../../app/theme";
import { toLocalDateTimeString } from "../../../app/datetime";
import { Avatar, InlineNotice, Panel, ScreenTitle, SmallDialog } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * R21 · Chi tiết buổi phỏng vấn (trang, thay InterviewDetailModal).
 * HR: duyệt / từ chối đề xuất đổi giờ, thêm người phỏng vấn, đổi giờ, huỷ buổi, đánh dấu vắng mặt.
 * Đại diện phòng ban được phân công: xác nhận giờ, đề xuất giờ khác, viết đánh giá khi buổi đã diễn ra.
 */
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const STATUS_VIEW: Record<string, { label: string; tone: StatusTone }> = {
    SCHEDULED: { label: "Chờ người phỏng vấn xác nhận", tone: "warning" },
    HM_RESCHEDULE_PROPOSED: { label: "Đề xuất đổi giờ", tone: "warning" },
    HM_CONFIRMED: { label: "Chờ ứng viên xác nhận", tone: "brand" },
    CANDIDATE_CONFIRMED: { label: "Đã xác nhận", tone: "success" },
    EVALUATION_PENDING: { label: "Chờ đánh giá", tone: "interview" },
    COMPLETED: { label: "Đã hoàn thành", tone: "success" },
    NO_SHOW: { label: "Ứng viên vắng mặt", tone: "danger" },
    CANCELLED: { label: "Đã huỷ", tone: "neutral" },
    CANDIDATE_DECLINED: { label: "Ứng viên xin dời", tone: "warning" },
};
const BLOCKING = new Set(["SCHEDULED", "HM_CONFIRMED", "HM_RESCHEDULE_PROPOSED", "CANDIDATE_CONFIRMED"]);
const when = (v: string | Dayjs) => { const d = dayjs(v); return `${WEEKDAY[d.day()]} ${d.format("DD/MM")} · ${d.format("HH:mm")}`; };

type Dialog = null | "cancel" | "interviewers" | "reschedule" | "propose" | "noshow";

export default function InterviewDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role);
    const myId = useAppSelector((s) => (s.auth.user?.userId ? Number(s.auth.user.userId) : null));
    const isHr = role === "RECRUITER" || role === "COMPANY_ADMIN";

    const [iv, setIv] = useState<InterviewResponse | null>(null);
    const [others, setOthers] = useState<InterviewResponse[]>([]);
    const [people, setPeople] = useState<UserDirectoryResponse[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [locations, setLocations] = useState<CatalogItem[]>([]);
    const [jobTitle, setJobTitle] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [pickedPeople, setPickedPeople] = useState<number[]>([]);
    const [newTime, setNewTime] = useState<Dayjs | null>(null);
    const [newDuration, setNewDuration] = useState(60);
    const [proposeNote, setProposeNote] = useState("");

    const load = useCallback(async () => {
        try {
            const r = await getInterviewById(Number(id));
            setIv(r.data);
            if (r.data.jobPostingId) getPostingById(r.data.jobPostingId).then((p) => setJobTitle(p.data.title)).catch(() => undefined);
        } catch {
            setIv(null);
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => {
        void load();
        getUserDirectory().then((r) => setPeople(r.data)).catch(() => undefined);
        getCatalogItems("/masterdata/departments").then((r) => setDepartments(r.data)).catch(() => undefined);
        getCatalogItems("/masterdata/work-locations").then((r) => setLocations(r.data)).catch(() => undefined);
        getInterviews().then((r) => setOthers(r.data.filter((x) => BLOCKING.has(x.status)))).catch(() => undefined);
    }, [load]);

    const proposalCheck = useMemo(() => {
        if (!iv?.proposedScheduledAt) return null;
        const s = dayjs(iv.proposedScheduledAt);
        const e = s.add(iv.durationMinutes ?? 60, "minute");
        const clash = (x: InterviewResponse) => {
            const xs = dayjs(x.scheduledAt);
            return x.id !== iv.id && xs.isBefore(e) && xs.add(x.durationMinutes ?? 60, "minute").isAfter(s);
        };
        const busyPeople = iv.interviewers.filter((p) => p.interviewerId !== iv.proposedBy
            && others.some((x) => clash(x) && x.interviewers.some((q) => q.interviewerId === p.interviewerId)));
        const candidateBusy = others.some((x) => clash(x) && x.candidateId != null && x.candidateId === iv.candidateId);
        return { busyPeople, candidateBusy };
    }, [iv, others]);

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    if (!iv) return <InlineNotice tone="danger" action={<Button onClick={() => navigate("/interviews")}>Về lịch phỏng vấn</Button>}>Không tìm thấy buổi phỏng vấn.</InlineNotice>;

    const person = (uid: number) => people.find((p) => p.id === uid);
    const deptName = (deptId: number | null | undefined) => String(departments.find((d) => d.id === deptId)?.name ?? "");
    const start = dayjs(iv.scheduledAt);
    const end = start.add(iv.durationMinutes ?? 60, "minute");
    const st = STATUS_VIEW[iv.status] ?? { label: iv.status, tone: "neutral" as StatusTone };
    const amInterviewer = myId != null && iv.interviewers.some((p) => p.interviewerId === myId);
    const proposer = iv.proposedBy ? iv.interviewers.find((p) => p.interviewerId === iv.proposedBy)?.fullName ?? person(iv.proposedBy)?.fullName : null;
    const ended = iv.status === "CANCELLED" || iv.status === "COMPLETED" || iv.status === "NO_SHOW";
    const location = iv.workLocationId != null ? String(locations.find((l) => l.id === iv.workLocationId)?.name ?? "") : "";
    const profilePath = iv.candidateId ? `/candidates/${iv.candidateId}/applications/${iv.applicationId}` : null;

    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try {
            await fn();
            message.success(ok);
            setDialog(null);
            await load();
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Thao tác thất bại");
        } finally { setBusy(false); }
    };

    const downloadIcs = async () => {
        try {
            const r = await getInterviewIcs(iv.id);
            saveAs(r.data, `phong-van-${iv.candidateName}.ics`);
        } catch { message.error("Không tải được tệp lịch"); }
    };

    const personStatus = (uid: number, submitted: boolean): { label: string; tone: StatusTone } => {
        if (submitted) return { label: "Đã nộp đánh giá", tone: "success" };
        if (iv.status === "HM_RESCHEDULE_PROPOSED" && iv.proposedBy === uid) return { label: "Đề xuất đổi giờ", tone: "warning" };
        if (person(uid)?.role === "RECRUITER") return { label: "Tuyển dụng", tone: "neutral" };
        if (iv.status === "SCHEDULED") return { label: "Chờ xác nhận", tone: "warning" };
        if (ended && iv.status === "CANCELLED") return { label: "—", tone: "neutral" };
        return { label: "Đã xác nhận", tone: "success" };
    };

    const actions: ReactNode[] = [];
    if (isHr && !ended) {
        actions.push(<Button key="ppl" onClick={() => { setPickedPeople(iv.interviewers.map((p) => p.interviewerId)); setDialog("interviewers"); }}>Thêm người phỏng vấn</Button>);
        actions.push(<Button key="time" onClick={() => { setNewTime(start); setNewDuration(iv.durationMinutes ?? 60); setDialog("reschedule"); }}>Đổi giờ</Button>);
        if (INTERVIEW_HELD.has(iv.status) && start.isBefore(dayjs())) actions.push(<Button key="ns" onClick={() => setDialog("noshow")}>Ứng viên vắng mặt</Button>);
        actions.push(<Button key="cancel" danger onClick={() => setDialog("cancel")}>Huỷ buổi</Button>);
    }
    if (!isHr && amInterviewer && iv.status === "SCHEDULED") {
        actions.push(<Button key="prop" onClick={() => { setNewTime(null); setProposeNote(""); setDialog("propose"); }}>Đề xuất giờ khác</Button>);
        actions.push(<Button key="ok" type="primary" loading={busy} onClick={() => run(() => confirmInterviewByHm(iv.id), "Đã xác nhận giờ phỏng vấn")}>Xác nhận</Button>);
    }
    const myEvalPending = amInterviewer && INTERVIEW_HELD.has(iv.status) && start.isBefore(dayjs())
        && iv.interviewers.some((p) => p.interviewerId === myId && !p.evaluationSubmitted);
    if (myEvalPending && profilePath) {
        actions.push(<Button key="eval" type="primary" onClick={() => navigate(`${profilePath}/evaluate?interviewId=${iv.id}`)}>Viết đánh giá</Button>);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1080 }}>
            <div>
                <PageBreadcrumb crumb={iv.candidateName} />
                <ScreenTitle title="Chi tiết buổi phỏng vấn" actions={actions.length ? <>{actions}</> : undefined} />
            </div>

            <Panel>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <Avatar name={iv.candidateName} colorKey={iv.candidateId ?? iv.applicationId} size={48} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <StatusTag {...st} />
                            <b style={{ fontSize: 18 }}>Phỏng vấn · {profilePath ? <a onClick={() => navigate(profilePath)}>{iv.candidateName}</a> : iv.candidateName}</b>
                        </span>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {[jobTitle, iv.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng", `${iv.durationMinutes ?? 60} phút`].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{start.format("HH:mm")} – {end.format("HH:mm")}</div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{WEEKDAY[start.day()]}, {start.format("DD/MM/YYYY")}</div>
                    </div>
                </div>
            </Panel>

            {iv.status === "CANDIDATE_DECLINED" && (
                <InlineNotice tone="warning" action={isHr ? (
                    <Button type="primary" onClick={() => navigate(`/interviews/schedule/${iv.applicationId}`)}>Đặt lịch mới</Button>
                ) : undefined}>
                    <b>{iv.candidateName}</b> xin dời lịch{iv.candidateDeclinedAt ? ` lúc ${dayjs(iv.candidateDeclinedAt).format("HH:mm DD/MM")}` : ""}
                    {iv.candidateDeclineReason ? <> — “{iv.candidateDeclineReason}”</> : null}
                </InlineNotice>
            )}

            {iv.status === "HM_RESCHEDULE_PROPOSED" && iv.proposedScheduledAt && (
                <InlineNotice tone="warning">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span><b>{proposer ?? "Người phỏng vấn"}</b> đề xuất đổi giờ{iv.proposalNote ? <> “{iv.proposalNote}”</> : null}</span>
                        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", fontSize: 13 }}>
                            <span><span style={{ color: COLORS.textSecondary }}>Giờ hiện tại </span><s>{when(iv.scheduledAt)}</s></span>
                            <span><span style={{ color: COLORS.textSecondary }}>Giờ đề xuất </span><b>{when(iv.proposedScheduledAt)}</b></span>
                        </div>
                        {proposalCheck && (
                            <span style={{ fontSize: 13, color: proposalCheck.busyPeople.length || proposalCheck.candidateBusy ? COLORS.error : COLORS.success }}>
                                {proposalCheck.busyPeople.length || proposalCheck.candidateBusy
                                    ? `Trùng lịch: ${[...proposalCheck.busyPeople.map((p) => p.fullName), proposalCheck.candidateBusy ? "ứng viên" : null].filter(Boolean).join(", ")}`
                                    : (() => {
                                        const rest = iv.interviewers.filter((p) => p.interviewerId !== iv.proposedBy).map((p) => p.fullName);
                                        const at = dayjs(iv.proposedScheduledAt).format("HH:mm");
                                        return rest.length ? `${[...rest, "ứng viên"].join(", ").replace(/, ([^,]*)$/, " và $1")} đều trống lúc ${at}` : `Ứng viên trống lúc ${at}`;
                                    })()}
                            </span>
                        )}
                        {isHr && (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button loading={busy} onClick={() => run(() => rejectHmProposal(iv.id), "Đã từ chối đề xuất, giữ giờ cũ")}>Từ chối đề xuất</Button>
                                <Button type="primary" loading={busy} onClick={() => run(() => approveHmProposal(iv.id), "Đã đổi giờ và báo ứng viên")}>Duyệt & báo ứng viên</Button>
                            </div>
                        )}
                    </div>
                </InlineNotice>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Người phỏng vấn" subtitle="Mỗi người nộp một phiếu đánh giá" bodyGap={0}>
                    {iv.interviewers.length === 0 && <span style={{ color: COLORS.textSecondary }}>Chưa có người phỏng vấn.</span>}
                    {iv.interviewers.map((p, i) => {
                        const u = person(p.interviewerId);
                        const ps = personStatus(p.interviewerId, p.evaluationSubmitted);
                        return (
                            <div key={p.interviewerId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `0.5px solid ${COLORS.border}` : undefined }}>
                                <Avatar name={p.fullName} colorKey={p.interviewerId} size={36} />
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 600 }}>{p.fullName}{p.interviewerId === myId ? " (bạn)" : ""}</span>
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                        {[u?.role === "RECRUITER" ? "Chuyên viên tuyển dụng" : "Đại diện phòng ban", deptName(u?.departmentId)].filter(Boolean).join(" · ")}
                                    </span>
                                </div>
                                <StatusTag {...ps} />
                            </div>
                        );
                    })}
                </Panel>

                <Panel title="Thông tin" bodyGap={10}>
                    <Info icon={iv.format === "ONLINE" ? <VideoCameraOutlined /> : <EnvironmentOutlined />} label={iv.format === "ONLINE" ? "Đường dẫn" : "Địa điểm"}>
                        {iv.format === "ONLINE"
                            ? (iv.meetingLink ? <a href={iv.meetingLink.startsWith("http") ? iv.meetingLink : `https://${iv.meetingLink}`} target="_blank" rel="noreferrer"><LinkOutlined /> {iv.meetingLink.replace(/^https?:\/\//, "")}</a> : "—")
                            : location || "—"}
                    </Info>
                    <Info icon={<CalendarOutlined />} label="Ứng viên">
                        {iv.candidateConfirmedAt ? `Đã xác nhận ${dayjs(iv.candidateConfirmedAt).format("DD/MM HH:mm")}`
                            : iv.status === "CANDIDATE_DECLINED" ? "Xin dời lịch" : iv.status === "HM_CONFIRMED" ? "Chờ ứng viên trả lời" : iv.status === "SCHEDULED" || iv.status === "HM_RESCHEDULE_PROPOSED" ? "Chưa gửi (chờ người phỏng vấn chốt giờ)" : "—"}
                    </Info>
                    {iv.note && <div style={{ padding: 12, borderRadius: 12, background: COLORS.fill, fontSize: 13, whiteSpace: "pre-wrap" }}>{iv.note}</div>}
                    <Button icon={<CalendarOutlined />} onClick={downloadIcs} style={{ alignSelf: "flex-start" }}>Tải tệp lịch (.ics)</Button>
                </Panel>
            </div>

            <SmallDialog open={dialog === "cancel"} title="Huỷ buổi phỏng vấn?" okText="Huỷ buổi" danger okLoading={busy}
                onCancel={() => setDialog(null)} onOk={() => run(() => cancelInterview(iv.id), "Đã huỷ buổi phỏng vấn")}>
                <span style={{ color: COLORS.textSecondary }}>Người phỏng vấn và ứng viên sẽ nhận thông báo huỷ. Không hoàn tác được.</span>
            </SmallDialog>

            <SmallDialog open={dialog === "noshow"} title="Ứng viên vắng mặt?" okText="Ghi nhận vắng mặt" danger okLoading={busy}
                onCancel={() => setDialog(null)} onOk={() => run(() => markInterviewNoShow(iv.id), "Đã ghi nhận ứng viên vắng mặt")}>
                <span style={{ color: COLORS.textSecondary }}>Buổi phỏng vấn sẽ đóng lại với trạng thái vắng mặt.</span>
            </SmallDialog>

            <SmallDialog open={dialog === "interviewers"} title="Người phỏng vấn" okText="Lưu" okLoading={busy} okDisabled={pickedPeople.length === 0}
                onCancel={() => setDialog(null)} onOk={() => run(() => updateInterviewers(iv.id, pickedPeople), "Đã cập nhật người phỏng vấn")}>
                <Select mode="multiple" value={pickedPeople} onChange={setPickedPeople} style={{ width: "100%" }} optionFilterProp="label"
                    options={people.filter((p) => p.role === "HIRING_MANAGER" || p.role === "RECRUITER")
                        .map((p) => ({ value: p.id, label: `${p.fullName}${p.role === "RECRUITER" ? " (Tuyển dụng)" : ""}`, disabled: iv.interviewers.some((q) => q.interviewerId === p.id && q.evaluationSubmitted) }))} />
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Người mới sẽ có phiếu đánh giá riêng. Người đã nộp đánh giá không bỏ được.</span>
            </SmallDialog>

            <SmallDialog open={dialog === "reschedule"} title="Đổi giờ phỏng vấn" okText="Đổi giờ" okLoading={busy}
                okDisabled={!newTime || !newTime.isAfter(dayjs())}
                onCancel={() => setDialog(null)}
                onOk={() => newTime && run(() => updateInterview(iv.id, {
                    scheduledAt: toLocalDateTimeString(newTime), durationMinutes: newDuration, format: iv.format,
                    workLocationId: iv.workLocationId, meetingLink: iv.meetingLink, note: iv.note,
                }), "Đã đổi giờ — người phỏng vấn sẽ xác nhận lại")}>
                <DatePicker showTime={{ format: "HH:mm", minuteStep: 15 }} format="DD/MM/YYYY HH:mm" style={{ width: "100%" }}
                    value={newTime} onChange={setNewTime} disabledDate={(d) => d.isBefore(dayjs(), "day")} />
                <InputNumber min={15} max={240} step={15} value={newDuration} onChange={(v) => setNewDuration(v ?? 60)} addonAfter="phút" style={{ width: "100%" }} />
            </SmallDialog>

            <SmallDialog open={dialog === "propose"} title="Đề xuất giờ khác" okText="Gửi đề xuất" okLoading={busy}
                okDisabled={!newTime || !newTime.isAfter(dayjs())}
                onCancel={() => setDialog(null)}
                onOk={() => newTime && run(() => rejectInterviewByHm(iv.id, { proposedScheduledAt: toLocalDateTimeString(newTime), note: proposeNote.trim() || null }), "Đã gửi đề xuất cho bộ phận tuyển dụng")}>
                <DatePicker showTime={{ format: "HH:mm", minuteStep: 15 }} format="DD/MM/YYYY HH:mm" style={{ width: "100%" }}
                    value={newTime} onChange={setNewTime} disabledDate={(d) => d.isBefore(dayjs(), "day")} />
                <Input.TextArea rows={3} maxLength={500} placeholder="Lý do, ví dụ: trùng buổi họp phát hành…" value={proposeNote} onChange={(e) => setProposeNote(e.target.value)} />
            </SmallDialog>
        </div>
    );
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 10, fontSize: 13 }}>
            <span style={{ color: COLORS.textMuted, paddingTop: 1 }}>{icon}</span>
            <span style={{ width: 80, color: COLORS.textSecondary, flexShrink: 0 }}>{label}</span>
            <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>{children}</span>
        </div>
    );
}
