import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Segmented, Skeleton } from "antd";
import {
    AuditOutlined, CalendarOutlined, EditOutlined, FileSearchOutlined, FileTextOutlined,
    SendOutlined, SolutionOutlined, SwapOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { getApplications } from "../../candidate/applicationApi";
import type { ApplicationResponse } from "../../candidate/types";
import { getInterviews } from "../../interview/interviewApi";
import type { InterviewResponse } from "../../interview/types";
import { getOffers } from "../../offer/offerApi";
import type { OfferResponse } from "../../offer/types";
import { getOpenPostings, getRequisitions } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse, JobRequisitionResponse } from "../../recruitment/types";
import { Avatar, IconTile, InlineNotice, Panel, StageBar } from "../../../components/ui/designKit";

/**
 * R01 / H01 · MÀN CHÍNH · Việc của tôi (quyết định B7 = phương án 1: frontend ghép nhiều API).
 * Chuyên viên tuyển dụng: 7 loại việc, tab "Của tôi / Cả nhóm". Đại diện phòng ban: việc của chính mình.
 * R33: lỗi tải → "Không tải được việc cần làm · Kiểm tra kết nối rồi thử lại." + "Thử lại".
 */

interface Task {
    key: string;
    icon: ReactNode;
    color: string;
    title: string;
    sub: string;
    action: string;
    to: string;
    mine: boolean;
}

interface Data {
    interviews: InterviewResponse[];
    applications: ApplicationResponse[];
    offers: OfferResponse[];
    requisitions: JobRequisitionResponse[];
    postings: JobPostingResponse[];
}

const ACTIVE_INTERVIEW = new Set(["SCHEDULED", "HM_RESCHEDULE_PROPOSED", "HM_CONFIRMED", "CANDIDATE_CONFIRMED", "EVALUATION_PENDING"]);

function greeting(now = dayjs()) {
    const h = now.hour();
    return h < 11 ? "Chào buổi sáng" : h < 13 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

const WEEKDAY = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const fmtTime = (v: string) => dayjs(v).format("HH:mm");
const fmtDay = (v: string) => dayjs(v).format("DD/MM");
const appPath = (candidateId: number | null | undefined, applicationId: number) =>
    candidateId ? `/candidates/${candidateId}/applications/${applicationId}` : "/applications";

export default function MyWorkPage() {
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);
    const isHr = user?.role === "RECRUITER";
    const me = Number(user?.userId);
    const [data, setData] = useState<Data | null>(null);
    const [failed, setFailed] = useState(false);
    const [scope, setScope] = useState<"mine" | "team">("mine");

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const [iv, apps, offers, reqs, postings] = await Promise.all([
                getInterviews(),
                getApplications({ size: 1000 }),
                isHr ? getOffers({ status: "DRAFT", size: 200 }) : Promise.resolve(null),
                getRequisitions({ size: 200 }),
                getOpenPostings(),
            ]);
            setData({
                interviews: iv.data,
                applications: apps.data.content,
                offers: offers?.data.content ?? [],
                requisitions: reqs.data.content,
                postings: postings.data,
            });
        } catch {
            setFailed(true);
        }
    }, [isHr]);

    useEffect(() => { void load(); }, [load]);

    const tasks = useMemo<Task[]>(() => (data ? (isHr ? recruiterTasks(data, me) : managerTasks(data, me)) : []), [data, isHr, me]);
    const shown = isHr && scope === "mine" ? tasks.filter((t) => t.mine) : tasks;

    // "Cả nhóm": mọi buổi trong ngày; "Của tôi" và Đại diện phòng ban: buổi mình tham gia.
    const today = (data?.interviews ?? [])
        .filter((iv) => iv.status !== "CANCELLED" && iv.status !== "CANDIDATE_DECLINED" && dayjs(iv.scheduledAt).isSame(dayjs(), "day"))
        .filter((iv) => (isHr && scope === "team") || iv.interviewers.some((i) => i.interviewerId === me))
        .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf());

    const now = dayjs();
    const firstName = (user?.fullName ?? "").trim().split(/\s+/).pop() ?? "";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>{greeting(now)}{firstName ? `, ${firstName}` : ""}</span>
                <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                    {WEEKDAY[now.day()]}, {now.format("DD/MM/YYYY")}
                    {data ? ` · ${today.length} buổi phỏng vấn và ${shown.length} việc cần làm` : ""}
                </span>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "1 1 560px", minWidth: 0 }}>
                    <Panel
                        title="Việc cần làm"
                        subtitle={isHr ? "Sắp xếp theo mức ưu tiên" : `${shown.length} việc đang chờ bạn`}
                        bodyGap={6}
                        extra={isHr ? (
                            <Segmented
                                value={scope}
                                onChange={(v) => setScope(v as "mine" | "team")}
                                options={[{ value: "mine", label: "Của tôi" }, { value: "team", label: "Cả nhóm" }]}
                            />
                        ) : undefined}
                    >
                        {failed ? (
                            <InlineNotice tone="danger" action={<Button onClick={() => void load()}>Thử lại</Button>}>
                                Không tải được việc cần làm · Kiểm tra kết nối rồi thử lại.
                            </InlineNotice>
                        ) : !data ? (
                            <Skeleton active paragraph={{ rows: 4 }} />
                        ) : shown.length === 0 ? (
                            <span style={{ color: COLORS.textSecondary, padding: "12px 0" }}>Không có việc nào đang chờ. Tốt lắm!</span>
                        ) : shown.map((t) => (
                            <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `0.5px solid ${COLORS.border}` }}>
                                <IconTile icon={t.icon} color={t.color} />
                                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</span>
                                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{t.sub}</span>
                                </div>
                                <Button size="small" style={{ color: COLORS.primary }} onClick={() => navigate(t.to)}>{t.action}</Button>
                            </div>
                        ))}
                    </Panel>

                    {data && <PostingsPanel data={data} isHr={isHr} onOpen={(p) => navigate(isHr ? `/recruitment/postings/${p}` : "/offers")} />}
                </div>

                <Panel
                    title="Lịch hôm nay"
                    extra={<a onClick={() => navigate("/interviews")} style={{ fontSize: 13, fontWeight: 600 }}>{isHr ? "Mở lịch" : "Xem lịch"}</a>}
                    style={{ flex: "0 1 380px" }}
                    bodyGap={8}
                >
                    {!data ? <Skeleton active paragraph={{ rows: 3 }} /> : today.length === 0 ? (
                        <span style={{ color: COLORS.textSecondary }}>Hôm nay không có buổi phỏng vấn nào.</span>
                    ) : today.map((iv) => <TodayRow key={iv.id} iv={iv} me={me} onOpen={() => navigate(appPath(iv.candidateId, iv.applicationId))} />)}
                </Panel>
            </div>
        </div>
    );
}

function TodayRow({ iv, me, onOpen }: { iv: InterviewResponse; me: number; onOpen: () => void }) {
    const start = dayjs(iv.scheduledAt);
    const end = start.add(iv.durationMinutes, "minute");
    const now = dayjs();
    const past = end.isBefore(now);
    const live = !past && iv.format === "ONLINE" && iv.meetingLink && now.isAfter(start.subtract(15, "minute"));
    const others = iv.interviewers.filter((i) => i.interviewerId !== me).map((i) => i.fullName);
    const where = iv.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng";
    const mine = iv.interviewers.some((i) => i.interviewerId === me);
    const people = mine ? ["bạn", ...others].join(" và ") : iv.interviewers.map((i) => i.fullName).join(", ");
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: COLORS.fill }}>
            <div style={{ display: "flex", flexDirection: "column", width: 48, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtTime(iv.scheduledAt)}</span>
                <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{iv.durationMinutes} phút</span>
            </div>
            <button type="button" onClick={onOpen} style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{iv.candidateName}</span>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{where} · {people}</span>
            </button>
            {past ? <span style={{ fontSize: 11, color: COLORS.textMuted }}>Đã diễn ra</span>
                : live ? <Button type="primary" size="small" href={iv.meetingLink ?? undefined} target="_blank">Vào phòng họp</Button>
                    : null}
        </div>
    );
}

/** "Việc làm đang tuyển · Ứng viên theo giai đoạn" (R01) / "Vị trí đang tuyển của phòng" (H01). */
function PostingsPanel({ data, isHr, onOpen }: { data: Data; isHr: boolean; onOpen: (postingId: number) => void }) {
    const byPosting = new Map<number, Partial<Record<FixedStage, number>>>();
    const totals = new Map<number, number>();
    data.applications.forEach((a) => {
        const s = toFixedStage(a.currentStageType);
        const m = byPosting.get(a.jobPostingId) ?? {};
        m[s] = (m[s] ?? 0) + 1;
        byPosting.set(a.jobPostingId, m);
        totals.set(a.jobPostingId, (totals.get(a.jobPostingId) ?? 0) + 1);
    });
    const reqById = new Map(data.requisitions.map((r) => [r.id, r]));
    const legend = FIXED_STAGES.filter((s) => s !== "REJECTED");
    return (
        <Panel
            title={isHr ? "Việc làm đang tuyển" : "Vị trí đang tuyển của phòng"}
            subtitle={isHr ? "Ứng viên theo giai đoạn" : undefined}
            extra={isHr ? undefined : <span />}
        >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {legend.map((s) => (
                    <span key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textSecondary }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: STAGE_COLORS[s].color }} />{FIXED_STAGE_LABEL[s]}
                    </span>
                ))}
            </div>
            {data.postings.length === 0 ? (
                <span style={{ color: COLORS.textSecondary }}>Chưa có việc làm nào đang tuyển.</span>
            ) : data.postings.map((p) => {
                const counts = byPosting.get(p.id) ?? {};
                const hired = counts.HIRED ?? 0;
                const head = p.headcount ?? 0;
                const req = reqById.get(p.requisitionId);
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onOpen(p.id)}
                        style={{
                            all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "1.3fr 1fr 2fr 80px",
                            gap: 12, alignItems: "center", padding: "12px 0", borderTop: `0.5px solid ${COLORS.border}`,
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</span>
                            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {[p.departmentName, head ? `tuyển ${head}` : null, head && hired >= head ? "đã đủ" : null].filter(Boolean).join(" · ")}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            {req ? <><Avatar name={req.requesterName} colorKey={req.requesterId} size={24} />
                                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{req.requesterName}</span></> : null}
                        </div>
                        <StageBar counts={counts} />
                        <span style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: "right" }}>
                            {isHr ? `${totals.get(p.id) ?? 0} ứng viên` : `Đã tuyển ${hired}/${head || "—"}`}
                        </span>
                    </button>
                );
            })}
        </Panel>
    );
}

/* ── R01: việc cần làm của Chuyên viên tuyển dụng ─────────────────────────── */
function recruiterTasks(d: Data, me: number): Task[] {
    const tasks: Task[] = [];
    const appById = new Map(d.applications.map((a) => [a.id, a]));

    // 1. Viết đánh giá phỏng vấn (buổi đã diễn ra, tôi là người phỏng vấn và chưa nộp)
    d.interviews.filter((iv) => iv.status !== "CANCELLED" && dayjs(iv.scheduledAt).isBefore(dayjs())
        && iv.interviewers.some((i) => i.interviewerId === me && !i.evaluationSubmitted))
        .forEach((iv) => {
            const done = iv.interviewers.filter((i) => i.evaluationSubmitted && i.interviewerId !== me).map((i) => i.fullName);
            tasks.push({
                key: `eval-${iv.id}`, icon: <EditOutlined />, color: COLORS.warning, mine: true,
                title: `Viết đánh giá phỏng vấn · ${iv.candidateName}`,
                sub: `Phỏng vấn ${fmtDay(iv.scheduledAt)} ${fmtTime(iv.scheduledAt)}${done.length ? ` · ${done.join(", ")} đã nộp` : ""}`,
                action: "Viết đánh giá", to: `${appPath(iv.candidateId, iv.applicationId)}/evaluate`,
            });
        });

    // 2. Xem đánh giá & quyết định (đã có phiếu nộp, hồ sơ còn ở giai đoạn Phỏng vấn)
    d.interviews.filter((iv) => iv.status !== "CANCELLED" && iv.interviewers.some((i) => i.evaluationSubmitted))
        .filter((iv) => toFixedStage(appById.get(iv.applicationId)?.currentStageType) === "INTERVIEW")
        .forEach((iv) => {
            const n = iv.interviewers.filter((i) => i.evaluationSubmitted).length;
            const app = appById.get(iv.applicationId);
            tasks.push({
                key: `decide-${iv.id}`, icon: <CheckCircleOutlined />, color: COLORS.success,
                mine: app?.assignedRecruiterId === me,
                title: `Xem đánh giá & quyết định · ${iv.candidateName}`,
                sub: `${n}/${iv.interviewers.length} người phỏng vấn đã nộp`,
                action: "Xem", to: appPath(iv.candidateId, iv.applicationId),
            });
        });

    // 3. Duyệt đề xuất đổi giờ
    d.interviews.filter((iv) => iv.status === "HM_RESCHEDULE_PROPOSED").forEach((iv) => {
        const app = appById.get(iv.applicationId);
        tasks.push({
            key: `resched-${iv.id}`, icon: <SwapOutlined />, color: COLORS.interview,
            mine: app?.assignedRecruiterId === me,
            title: `Duyệt đề xuất đổi giờ · ${iv.candidateName}`,
            sub: `Xin dời ${fmtDay(iv.scheduledAt)} ${fmtTime(iv.scheduledAt)}${iv.proposedScheduledAt ? ` → ${fmtTime(iv.proposedScheduledAt)}` : ""}`,
            action: "Xem", to: "/interviews",
        });
    });

    // 3b. Ứng viên xin dời lịch → đặt giờ mới
    d.interviews.filter((iv) => iv.status === "CANDIDATE_DECLINED")
        .filter((iv) => !d.interviews.some((x) => x.applicationId === iv.applicationId && ACTIVE_INTERVIEW.has(x.status)))
        .forEach((iv) => {
            const app = appById.get(iv.applicationId);
            tasks.push({
                key: `declined-${iv.id}`, icon: <CalendarOutlined />, color: COLORS.warning,
                mine: app?.assignedRecruiterId === me,
                title: `Ứng viên xin dời lịch · ${iv.candidateName}`,
                sub: iv.candidateDeclineReason ? `“${iv.candidateDeclineReason}”` : `Lịch cũ ${fmtDay(iv.scheduledAt)} ${fmtTime(iv.scheduledAt)}`,
                action: "Đặt lịch mới", to: `/interviews/schedule/${iv.applicationId}`,
            });
        });

    // 4. Sàng lọc hồ sơ mới
    const fresh = d.applications.filter((a) => toFixedStage(a.currentStageType) === "APPLIED");
    const freshMine = fresh.filter((a) => a.assignedRecruiterId === me);
    for (const [list, mine] of [[fresh, false], [freshMine, true]] as const) {
        if (!list.length) continue;
        const old = list.filter((a) => dayjs().diff(dayjs(a.appliedAt), "day") >= 2).length;
        tasks.push({
            key: `screen-${mine}`, icon: <FileSearchOutlined />, color: COLORS.primary, mine,
            title: `Sàng lọc ${list.length} hồ sơ mới`,
            sub: old ? `${old} hồ sơ quá 2 ngày chưa xem` : "Hồ sơ mới vào, chưa xem",
            action: "Xem hồ sơ", to: "/applications?stageType=APPLIED",
        });
    }

    // 5. Lên lịch phỏng vấn (đang ở giai đoạn Phỏng vấn nhưng chưa có buổi nào còn hiệu lực)
    const scheduled = new Set(d.interviews.filter((iv) => ACTIVE_INTERVIEW.has(iv.status)).map((iv) => iv.applicationId));
    // Hồ sơ có buổi "ứng viên xin dời" đã có việc riêng (3b) — không đếm lại ở đây.
    const declined = new Set(d.interviews.filter((iv) => iv.status === "CANDIDATE_DECLINED").map((iv) => iv.applicationId));
    const toSchedule = d.applications.filter((a) => toFixedStage(a.currentStageType) === "INTERVIEW" && !scheduled.has(a.id) && !declined.has(a.id));
    for (const [list, mine] of [[toSchedule, false], [toSchedule.filter((a) => a.assignedRecruiterId === me), true]] as const) {
        if (!list.length) continue;
        tasks.push({
            key: `schedule-${mine}`, icon: <CalendarOutlined />, color: COLORS.warning, mine,
            title: `Lên lịch phỏng vấn cho ${list.length} ứng viên`,
            sub: `${list.slice(0, 2).map((a) => a.candidateName).join(", ")}${list.length > 2 ? "…" : ""} · đã qua sàng lọc`,
            action: "Lên lịch", to: "/interviews",
        });
    }

    // 6. Gửi thư mời (bản nháp)
    d.offers.forEach((o) => tasks.push({
        key: `offer-${o.id}`, icon: <SendOutlined />, color: COLORS.primary, mine: o.requesterId === me,
        title: `Gửi thư mời cho ${o.candidateName}`,
        sub: `Bản nháp sẵn sàng${o.salaryOffered ? ` · ${Math.round(o.salaryOffered / 1_000_000)} triệu` : ""}`,
        action: "Xem", to: `/offers/${o.id}`,
    }));

    // 7. Duyệt yêu cầu tuyển dụng
    const pending = d.requisitions.filter((r) => r.status === "PENDING_APPROVAL");
    if (pending.length) {
        const depts = [...new Set(pending.map((r) => (r as JobRequisitionResponse & { departmentName?: string }).departmentName).filter(Boolean))];
        tasks.push({
            key: "approve-req", icon: <AuditOutlined />, color: COLORS.primaryHover, mine: true,
            title: `Duyệt ${pending.length} yêu cầu tuyển dụng`,
            sub: depts.length ? depts.map((x) => `Phòng ${x}`).join(" · ") : pending.map((r) => r.title).slice(0, 2).join(" · "),
            action: "Duyệt", to: "/recruitment/requisitions",
        });
    }
    return tasks;
}

/* ── H01: việc cần làm của Đại diện phòng ban ─────────────────────────────── */
function managerTasks(d: Data, me: number): Task[] {
    const tasks: Task[] = [];
    d.interviews.filter((iv) => iv.status !== "CANCELLED" && dayjs(iv.scheduledAt).isBefore(dayjs())
        && iv.interviewers.some((i) => i.interviewerId === me && !i.evaluationSubmitted))
        .forEach((iv) => {
            const done = iv.interviewers.filter((i) => i.evaluationSubmitted).length;
            tasks.push({
                key: `eval-${iv.id}`, icon: <EditOutlined />, color: COLORS.warning, mine: true,
                title: `Nộp đánh giá phỏng vấn · ${iv.candidateName}`,
                sub: `Phỏng vấn ${fmtDay(iv.scheduledAt)} · ${done}/${iv.interviewers.length} đã nộp, còn bạn`,
                action: "Viết đánh giá", to: `${appPath(iv.candidateId, iv.applicationId)}/evaluate`,
            });
        });
    d.interviews.filter((iv) => iv.status === "SCHEDULED" && !iv.hmConfirmed && iv.interviewers.some((i) => i.interviewerId === me))
        .forEach((iv) => tasks.push({
            key: `confirm-${iv.id}`, icon: <CalendarOutlined />, color: COLORS.interview, mine: true,
            title: `Xác nhận tham gia phỏng vấn · ${iv.candidateName}`,
            sub: `${WEEKDAY[dayjs(iv.scheduledAt).day()]} ${fmtDay(iv.scheduledAt)} · ${fmtTime(iv.scheduledAt)} – ${dayjs(iv.scheduledAt).add(iv.durationMinutes, "minute").format("HH:mm")} · ${iv.format === "ONLINE" ? "Trực tuyến" : "Tại văn phòng"}`,
            action: "Xác nhận", to: "/interviews",
        }));
    d.requisitions.filter((r) => r.requesterId === me && r.status === "CHANGES_REQUESTED").forEach((r) => tasks.push({
        key: `fix-${r.id}`, icon: <SolutionOutlined />, color: COLORS.interview, mine: true,
        title: `Sửa yêu cầu tuyển dụng · ${r.title}`,
        sub: r.hrNote ? `Chuyên viên tuyển dụng góp ý: ${r.hrNote}` : "Chuyên viên tuyển dụng yêu cầu sửa",
        action: "Mở yêu cầu", to: "/recruitment/requisitions",
    }));
    d.requisitions.filter((r) => r.requesterId === me && r.status === "DRAFT").forEach((r) => tasks.push({
        key: `draft-${r.id}`, icon: <FileTextOutlined />, color: COLORS.textSecondary, mine: true,
        title: `Hoàn thiện bản nháp · ${r.title}`,
        sub: `Lưu nháp ${fmtDay(r.createdAt)} · chưa gửi duyệt`,
        action: "Mở nháp", to: "/recruitment/requisitions",
    }));
    return tasks;
}
