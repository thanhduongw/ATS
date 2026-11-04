import { useEffect, useMemo, useState } from "react";
import { App, Button, DatePicker, Input, Segmented, Select, Spin } from "antd";
import { CloseOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { createInterview, createSlotBatch, getInterviews } from "../interviewApi";
import type { ApiMessageResponse, InterviewFormat, InterviewResponse } from "../types";
import { getApplicationById } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import { isSchedulable } from "../scheduleEligibility";
import { toLocalDateTimeString } from "../../../app/datetime";
import { COLORS } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { AiScorePill, Avatar, InlineNotice, Panel, ScreenTitle } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";

/**
 * R18 · Lên lịch phỏng vấn (trang). Hai cách:
 *  - "Tôi chọn giờ": chọn 1 ô → tạo buổi phỏng vấn ngay (người phỏng vấn xác nhận, rồi ứng viên xác nhận).
 *  - "Để ứng viên chọn": chọn tối đa 5 ô → gửi khung giờ kèm hạn chọn; ứng viên chọn ở C13, HR chốt.
 * Lưới giờ tuần: ô xám = người phỏng vấn đã có buổi khác trùng giờ (đếm cả thời lượng đang chọn).
 */
type Mode = "PICK" | "CANDIDATE";
const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const STEP = 30;
const LUNCH = [12 * 60, 13 * 60];
const MAX_SLOTS = 5;
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const BLOCKING = new Set(["SCHEDULED", "HM_CONFIRMED", "HM_RESCHEDULE_PROPOSED", "CANDIDATE_CONFIRMED"]);

const slotLabel = (d: Dayjs, minutes: number) =>
    `${WEEKDAY_FULL[d.day()]} ${d.format("DD/MM")} · ${d.format("HH:mm")} – ${d.add(minutes, "minute").format("HH:mm")}`;

export default function ScheduleInterviewPage() {
    const { applicationId } = useParams();
    const appId = Number(applicationId);
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [app, setApp] = useState<ApplicationResponse | null>(null);
    const [people, setPeople] = useState<UserDirectoryResponse[]>([]);
    const [locations, setLocations] = useState<CatalogItem[]>([]);
    const [busy, setBusy] = useState<InterviewResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const [mode, setMode] = useState<Mode>("CANDIDATE");
    const [duration, setDuration] = useState(60);
    const [format, setFormat] = useState<InterviewFormat>("ONLINE");
    const [meetingLink, setMeetingLink] = useState("");
    const [workLocationId, setWorkLocationId] = useState<number | undefined>();
    const [interviewerIds, setInterviewerIds] = useState<number[]>([]);
    const [picked, setPicked] = useState<Dayjs[]>([]);
    const [deadline, setDeadline] = useState<Dayjs | null>(null);
    const [note, setNote] = useState("");
    const [weekStart, setWeekStart] = useState(() => {
        const t = dayjs().add(1, "day");
        return t.subtract((t.day() + 6) % 7, "day").startOf("day");
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            getApplicationById(appId).then((r) => r.data),
            getUserDirectory().then((r) => r.data).catch(() => []),
            getCatalogItems("/masterdata/work-locations").then((r) => r.data.filter((x) => x.active)).catch(() => []),
            getInterviews().then((r) => r.data).catch(() => []),
        ]).then(([a, users, locs, ivs]) => {
            setApp(a);
            const staff = users.filter((u) => u.role === "HIRING_MANAGER" || u.role === "RECRUITER");
            setPeople(staff);
            setLocations(locs);
            setBusy(ivs.filter((iv) => BLOCKING.has(iv.status)));
            // Mặc định: đại diện phòng ban của hồ sơ.
            const rep = staff.find((u) => u.role === "HIRING_MANAGER" && u.departmentId === a.departmentId);
            if (rep) setInterviewerIds([rep.id]);
            setWorkLocationId(locs[0]?.id);
        }).catch(() => message.error("Không tải được hồ sơ"))
            .finally(() => setLoading(false));
    }, [appId, message]);

    const days = useMemo(() => [0, 1, 2, 3, 4].map((i) => weekStart.add(i, "day")), [weekStart]);
    const rows = useMemo(() => {
        const r: number[] = [];
        for (let m = DAY_START; m + duration <= DAY_END; m += STEP) {
            if (m < LUNCH[1] && m + duration > LUNCH[0]) continue;
            r.push(m);
        }
        return r;
    }, [duration]);

    /** Người phỏng vấn đang chọn nào bận trong [start, start + duration). */
    const conflictsAt = (start: Dayjs) => {
        const end = start.add(duration, "minute");
        return busy.filter((iv) => {
            const s = dayjs(iv.scheduledAt);
            const e = s.add(iv.durationMinutes ?? 60, "minute");
            const overlap = s.isBefore(end) && e.isAfter(start);
            return overlap && (iv.applicationId === appId || iv.interviewers.some((p) => interviewerIds.includes(p.interviewerId)));
        });
    };

    const isPicked = (d: Dayjs) => picked.some((p) => p.isSame(d, "minute"));
    const toggle = (d: Dayjs) => {
        if (mode === "PICK") { setPicked(isPicked(d) ? [] : [d]); return; }
        if (isPicked(d)) setPicked(picked.filter((p) => !p.isSame(d, "minute")));
        else if (picked.length >= MAX_SLOTS) message.warning(`Tối đa ${MAX_SLOTS} khung giờ`);
        else setPicked([...picked, d].sort((a, b) => a.valueOf() - b.valueOf()));
    };

    if (loading) return <div style={{ padding: 80, textAlign: "center" }}><Spin /></div>;
    if (!app) return <InlineNotice tone="danger">Không tìm thấy hồ sơ.</InlineNotice>;

    const backTo = `/candidates/${app.candidateId}/applications/${app.id}`;
    // Hạn mặc định: 17:00 hôm trước khung đầu tiên, nhưng ít nhất 2 giờ kể từ bây giờ và trước khung đầu 1 giờ.
    const defaultDeadline = (() => {
        if (!picked[0]) return null;
        let d = picked[0].subtract(1, "day").hour(17).minute(0).second(0);
        const floor = dayjs().add(2, "hour").minute(0).second(0);
        if (d.isBefore(floor)) d = floor;
        const ceil = picked[0].subtract(1, "hour");
        return d.isAfter(ceil) ? ceil : d;
    })();
    const effectiveDeadline = deadline ?? defaultDeadline;
    const canSubmit = picked.length > 0 && interviewerIds.length > 0 && (format === "ONLINE" ? !!meetingLink.trim() : !!workLocationId)
        && (mode === "PICK" || (effectiveDeadline != null && effectiveDeadline.isAfter(dayjs())));

    const submit = async () => {
        setSaving(true);
        try {
            const common = {
                format, interviewerIds,
                meetingLink: format === "ONLINE" ? meetingLink.trim() : null,
                workLocationId: format === "OFFLINE" ? workLocationId ?? null : null,
                note: note.trim() || null,
            };
            if (mode === "PICK") {
                await createInterview({ ...common, applicationId: app.id, scheduledAt: toLocalDateTimeString(picked[0]), durationMinutes: duration });
                message.success("Đã lên lịch. Người phỏng vấn sẽ xác nhận rồi báo ứng viên.");
            } else {
                await createSlotBatch({
                    ...common, applicationId: app.id,
                    slots: picked.map((p) => ({ startTime: toLocalDateTimeString(p), endTime: toLocalDateTimeString(p.add(duration, "minute")) })),
                    responseDeadline: effectiveDeadline ? toLocalDateTimeString(effectiveDeadline) : null,
                });
                message.success(`Đã gửi ${picked.length} khung giờ cho ${app.candidateName}`);
            }
            navigate(backTo);
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không lên lịch được");
        } finally { setSaving(false); }
    };

    const chosenPeople = people.filter((p) => interviewerIds.includes(p.id));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <PageBreadcrumb crumb={`${app.candidateName} · Lên lịch phỏng vấn`} />
                <ScreenTitle
                    title="Lên lịch phỏng vấn"
                    actions={<>
                        <Button onClick={() => navigate(backTo)}>Huỷ</Button>
                        <Button type="primary" disabled={!canSubmit} loading={saving} onClick={submit}>
                            {mode === "PICK" ? "Lên lịch" : `Gửi ${picked.length || ""} khung giờ`.replace("  ", " ")}
                        </Button>
                    </>}
                />
            </div>
            {mode === "CANDIDATE" && effectiveDeadline && !effectiveDeadline.isAfter(dayjs()) && (
                <InlineNotice tone="warning">Hạn chọn giờ đã qua — chọn hạn khác trước khi gửi.</InlineNotice>
            )}
            {!isSchedulable(app) && (
                <InlineNotice tone="warning">Hồ sơ đang ở giai đoạn {FIXED_STAGE_LABEL[toFixedStage(app.currentStageType)]} — chuyển sang Phỏng vấn trước khi lên lịch.</InlineNotice>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Panel>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar name={app.candidateName} colorKey={app.candidateId} size={44} />
                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                <b>{app.candidateName}</b>
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                    {app.jobTitle} · {FIXED_STAGE_LABEL[toFixedStage(app.currentStageType)]}
                                </span>
                            </div>
                            {app.aiScore != null && <AiScorePill score={app.aiScore} size="sm" />}
                        </div>
                    </Panel>

                    <Panel title="Thông tin buổi phỏng vấn" bodyGap={14}>
                        <Segmented<Mode> block value={mode} onChange={(m) => { setMode(m); setPicked((p) => (m === "PICK" ? p.slice(0, 1) : p)); }}
                            options={[{ value: "PICK", label: "Tôi chọn giờ" }, { value: "CANDIDATE", label: "Để ứng viên chọn" }]} />
                        <Field label="Thời lượng">
                            <Select value={duration} onChange={(v) => { setDuration(v); setPicked([]); }} style={{ width: "100%" }}
                                options={[30, 45, 60, 90].map((m) => ({ value: m, label: `${m} phút` }))} />
                        </Field>
                        <Field label="Hình thức">
                            <Segmented<InterviewFormat> block value={format} onChange={setFormat}
                                options={[{ value: "ONLINE", label: "Trực tuyến" }, { value: "OFFLINE", label: "Tại văn phòng" }]} />
                        </Field>
                        {format === "ONLINE" ? (
                            <Field label="Đường dẫn cuộc họp">
                                <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="meet.google.com/abc-defg-hij" />
                            </Field>
                        ) : (
                            <Field label="Địa điểm">
                                <Select value={workLocationId} onChange={setWorkLocationId} style={{ width: "100%" }}
                                    options={locations.map((l) => ({ value: l.id, label: String(l.name) }))} />
                            </Field>
                        )}
                        <Field label="Người phỏng vấn">
                            <Select mode="multiple" value={interviewerIds} onChange={setInterviewerIds} style={{ width: "100%" }}
                                optionFilterProp="label" placeholder="Chọn người phỏng vấn"
                                options={people.map((p) => ({ value: p.id, label: `${p.fullName}${p.role === "RECRUITER" ? " (Tuyển dụng)" : ""}` }))} />
                        </Field>
                        <Field label={mode === "PICK" ? "Giờ đã chọn" : `${picked.length} khung giờ đã chọn`}>
                            {picked.length === 0
                                ? <span style={{ fontSize: 13, color: COLORS.textMuted }}>Bấm vào ô trống trên lưới giờ bên phải</span>
                                : picked.map((p) => (
                                    <div key={p.valueOf()} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                                        <span>{slotLabel(p, duration)}</span>
                                        <a onClick={() => toggle(p)} aria-label="Bỏ khung giờ"><CloseOutlined /></a>
                                    </div>
                                ))}
                        </Field>
                        {mode === "CANDIDATE" && (
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                Ứng viên chọn giờ trên cổng ứng viên. Hồ sơ do bạn thêm tay thì ứng viên cần đăng ký bằng đúng email trong hồ sơ để thấy khung giờ.
                            </span>
                        )}
                        {mode === "CANDIDATE" && (
                            <Field label="Hạn ứng viên chọn giờ">
                                <DatePicker showTime={{ format: "HH:mm", minuteStep: 15 }} format="DD/MM/YYYY HH:mm" style={{ width: "100%" }}
                                    value={effectiveDeadline} onChange={setDeadline}
                                    disabledDate={(d) => d.isBefore(dayjs(), "day") || (!!picked[0] && d.isAfter(picked[0], "day"))} />
                            </Field>
                        )}
                        <Field label="Ghi chú cho ứng viên">
                            <Input.TextArea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                                placeholder="Nội dung buổi phỏng vấn, cần chuẩn bị gì…" />
                        </Field>
                    </Panel>
                </div>

                <Panel
                    title="Chọn khung giờ"
                    subtitle="Ô xám là giờ người phỏng vấn đã có buổi khác trong hệ thống"
                    extra={
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Button size="small" icon={<LeftOutlined />} disabled={weekStart.isBefore(dayjs())} onClick={() => setWeekStart(weekStart.subtract(7, "day"))} />
                            <span style={{ fontSize: 13, minWidth: 110, textAlign: "center" }}>
                                {days[0].format("DD/MM")} – {days[4].format("DD/MM/YYYY")}
                            </span>
                            <Button size="small" icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(7, "day"))} />
                        </span>
                    }
                >
                    <div style={{ display: "grid", gridTemplateColumns: `56px repeat(5, minmax(0, 1fr))`, gap: 4 }}>
                        <span />
                        {days.map((d) => (
                            <span key={d.valueOf()} style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: d.isSame(dayjs(), "day") ? COLORS.primary : COLORS.textPrimary }}>
                                {WEEKDAY[d.day()]} {d.format("DD")}
                            </span>
                        ))}
                        {rows.map((m) => (
                            <Row key={m} minute={m}>
                                {days.map((d) => {
                                    const start = d.add(m, "minute");
                                    const past = !start.isAfter(dayjs());
                                    const conflicts = past ? [] : conflictsAt(start);
                                    const sel = isPicked(start);
                                    const blocked = past || conflicts.length > 0;
                                    const who = conflicts.flatMap((c) => c.interviewers.filter((p) => interviewerIds.includes(p.interviewerId)).map((p) => p.fullName));
                                    return (
                                        <button
                                            key={d.valueOf()}
                                            type="button"
                                            disabled={blocked && !sel}
                                            title={conflicts.length ? `Đã có lịch: ${[...new Set(who)].join(", ") || "ứng viên"}` : undefined}
                                            onClick={() => toggle(start)}
                                            style={{
                                                height: 28, borderRadius: 8, border: 0, fontFamily: "inherit", fontSize: 11,
                                                cursor: blocked && !sel ? "not-allowed" : "pointer",
                                                background: sel ? COLORS.primary : conflicts.length ? "#D9DCE1" : past ? "transparent" : COLORS.fill,
                                                color: sel ? "#fff" : COLORS.textSecondary,
                                            }}
                                        >
                                            {sel ? start.format("HH:mm") : conflicts.length ? "Bận" : ""}
                                        </button>
                                    );
                                })}
                            </Row>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.textSecondary, flexWrap: "wrap" }}>
                        <Legend color={COLORS.fill} label="Còn trống" />
                        <Legend color="#D9DCE1" label="Đã có lịch" />
                        <Legend color={COLORS.primary} label={mode === "PICK" ? "Giờ đã chọn" : "Khung gửi ứng viên"} />
                        {chosenPeople.length > 0 && <span>Kiểm tra lịch của: {chosenPeople.map((p) => p.fullName).join(", ")}</span>}
                    </div>
                </Panel>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            {children}
        </div>
    );
}

function Row({ minute, children }: { minute: number; children: React.ReactNode }) {
    return (
        <>
            <span style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "right", paddingRight: 6, lineHeight: "28px" }}>
                {String(Math.floor(minute / 60)).padStart(2, "0")}:{String(minute % 60).padStart(2, "0")}
            </span>
            {children}
        </>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: color }} />{label}
        </span>
    );
}
