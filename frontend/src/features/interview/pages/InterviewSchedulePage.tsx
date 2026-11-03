import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Dropdown, Input, Modal, Segmented, Select, Space, Spin, Tooltip, type MenuProps } from "antd";
import {
    LeftOutlined, PlusOutlined, RightOutlined, SearchOutlined, SwapOutlined, ThunderboltOutlined, UserOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { confirmInterviewByHm, getInterviews } from "../interviewApi";
import { getUserDirectory } from "../../auth/authApi";
import type { UserDirectoryResponse } from "../../auth/types";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import { INTERVIEW_HELD, type InterviewResponse } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { COLORS, type StatusTone } from "../../../app/theme";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { AvatarGroup, Avatar } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import InterviewDetailModal from "../components/InterviewDetailModal";
import InterviewQuickCreateModal from "../components/InterviewQuickCreateModal";
import BulkScheduleModal from "../components/BulkScheduleModal";
import InterviewTimeGrid from "../components/InterviewTimeGrid";
import CandidateComparisonPanel from "../../offer/components/CandidateComparisonPanel";
import { sessionAccent, type SessionDisplay } from "../session";

/**
 * R40 (danh sách theo ngày) / R20 (lịch tuần) · MÀN CHÍNH · Lịch phỏng vấn.
 * 5 tab rời nhau (mỗi buổi chỉ thuộc 1 tab):
 *  - Đã huỷ: CANCELLED
 *  - Đã xong: COMPLETED, NO_SHOW, hoặc đã diễn ra và mọi người đã nộp đánh giá
 *  - Chờ đánh giá: đã diễn ra, còn người chưa nộp
 *  - Cần xử lý: đề xuất đổi giờ, hoặc còn ≤ 48 giờ mà người phỏng vấn chưa xác nhận
 *  - Sắp tới: phần còn lại
 */
type Tab = "ACTION" | "UPCOMING" | "EVAL" | "DONE" | "CANCELLED";
const TABS: { key: Tab; label: string }[] = [
    { key: "ACTION", label: "Cần xử lý" },
    { key: "UPCOMING", label: "Sắp tới" },
    { key: "EVAL", label: "Chờ đánh giá" },
    { key: "DONE", label: "Đã xong" },
    { key: "CANCELLED", label: "Đã huỷ" },
];
const WEEKDAY = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const HM_COLS = "110px 1.3fr 1.2fr 120px 1.6fr";

const endOf = (iv: InterviewResponse) => dayjs(iv.scheduledAt).add(iv.durationMinutes ?? 60, "minute");

function tabOf(iv: InterviewResponse, now: Dayjs): Tab {
    if (iv.status === "CANCELLED") return "CANCELLED";
    if (iv.status === "COMPLETED" || iv.status === "NO_SHOW") return "DONE";
    const ended = endOf(iv).isBefore(now);
    if (ended && INTERVIEW_HELD.has(iv.status)) {
        return iv.interviewers.some((p) => !p.evaluationSubmitted) ? "EVAL" : "DONE";
    }
    if (iv.status === "HM_RESCHEDULE_PROPOSED") return "ACTION";
    if (iv.status === "SCHEDULED" && dayjs(iv.scheduledAt).diff(now, "hour") <= 48) return "ACTION";
    return "UPCOMING";
}

/**
 * H11 · Đại diện phòng ban: chỉ các buổi mình được phân công, 4 tab.
 *  - Cần xử lý: đã diễn ra mà mình chưa nộp đánh giá, hoặc lịch chưa được mình xác nhận
 *  - Đã xong: đã diễn ra / hoàn tất / ứng viên vắng
 *  - Sắp tới: phần còn lại (buổi đã huỷ chỉ nằm trong "Tất cả")
 */
type HmTab = "ACTION" | "UPCOMING" | "DONE" | "ALL";
const HM_TABS: { key: HmTab; label: string }[] = [
    { key: "ACTION", label: "Cần xử lý" }, { key: "UPCOMING", label: "Sắp tới" },
    { key: "DONE", label: "Đã xong" }, { key: "ALL", label: "Tất cả" },
];
type HmKind = "EVAL" | "CONFIRM" | "UPCOMING" | "DONE" | "CANCELLED";

function hmKindOf(iv: InterviewResponse, me: number | null, now: Dayjs): HmKind {
    if (iv.status === "CANCELLED") return "CANCELLED";
    if (iv.status === "COMPLETED" || iv.status === "NO_SHOW") return "DONE";
    const mine = iv.interviewers.find((p) => p.interviewerId === me);
    if (endOf(iv).isBefore(now)) return mine && !mine.evaluationSubmitted && INTERVIEW_HELD.has(iv.status) ? "EVAL" : "DONE";
    if (iv.status === "SCHEDULED" && !iv.hmConfirmed) return "CONFIRM";
    return "UPCOMING";
}
const HM_KIND_TAB: Record<HmKind, HmTab | null> = { EVAL: "ACTION", CONFIRM: "ACTION", UPCOMING: "UPCOMING", DONE: "DONE", CANCELLED: null };
const HM_KIND_GROUP: Record<HmKind, string> = {
    EVAL: "Cần đánh giá", CONFIRM: "Cần xác nhận", UPCOMING: "Sắp tới", DONE: "Đã xong", CANCELLED: "Đã huỷ",
};

function hmStatusText(iv: InterviewResponse, kind: HmKind, me: number | null): { label: string; tone: StatusTone } {
    const done = iv.interviewers.filter((p) => p.evaluationSubmitted).length;
    switch (kind) {
        case "CANCELLED": return { label: "Đã huỷ", tone: "neutral" };
        case "EVAL": return { label: `${done}/${iv.interviewers.length} đã nộp · còn bạn`, tone: "warning" };
        case "CONFIRM": return { label: "Chờ bạn xác nhận", tone: "warning" };
        case "DONE":
            if (iv.status === "NO_SHOW") return { label: "Ứng viên vắng", tone: "danger" };
            return iv.interviewers.find((p) => p.interviewerId === me)?.evaluationSubmitted
                ? { label: "Bạn đã nộp đánh giá", tone: "success" } : { label: "Đã xong", tone: "success" };
        default:
            if (iv.status === "HM_RESCHEDULE_PROPOSED") {
                return {
                    label: iv.proposedScheduledAt
                        ? `Bạn đề xuất đổi sang ${dayjs(iv.proposedScheduledAt).format("HH:mm DD/MM")}`
                        : "Bạn đã đề xuất đổi giờ",
                    tone: "interview",
                };
            }
            return iv.status === "HM_CONFIRMED"
                ? { label: "Chờ ứng viên xác nhận", tone: "neutral" } : { label: "Đã xác nhận", tone: "success" };
    }
}

/** Chữ trạng thái như HTML: "Chờ đánh giá 1/2", "Đã xác nhận", "Đề xuất đổi giờ"… */
function statusText(iv: InterviewResponse, tab: Tab): { label: string; tone: StatusTone } {
    if (tab === "CANCELLED") return { label: "Đã huỷ", tone: "neutral" };
    if (iv.status === "NO_SHOW") return { label: "Ứng viên vắng", tone: "danger" };
    if (tab === "EVAL" || (tab === "DONE" && iv.status !== "COMPLETED")) {
        const done = iv.interviewers.filter((p) => p.evaluationSubmitted).length;
        return tab === "EVAL"
            ? { label: `Chờ đánh giá ${done}/${iv.interviewers.length}`, tone: "warning" }
            : { label: "Đã nộp đủ đánh giá", tone: "success" };
    }
    if (tab === "DONE") return { label: "Đã xong", tone: "success" };
    switch (iv.status) {
        case "HM_RESCHEDULE_PROPOSED": return { label: "Đề xuất đổi giờ", tone: "interview" };
        case "SCHEDULED": return { label: "Chờ người phỏng vấn xác nhận", tone: "warning" };
        case "HM_CONFIRMED": return { label: "Chờ ứng viên xác nhận", tone: "warning" };
        default: return { label: "Đã xác nhận", tone: "success" };
    }
}

export default function InterviewSchedulePage() {
    const { message } = App.useApp();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const role = useAppSelector((s) => s.auth.user?.role);
    const isHr = !!role && HR_ROLES.includes(role);
    const myId = useAppSelector((s) => (s.auth.user?.userId ? Number(s.auth.user.userId) : null));
    const [hmTab, setHmTab] = useState<HmTab | null>(null);
    const [confirming, setConfirming] = useState<number | null>(null);

    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab | null>(null);
    const [view, setView] = useState<"list" | "week">("list");
    const [weekAnchor, setWeekAnchor] = useState<Dayjs>(dayjs());
    const [keyword, setKeyword] = useState("");
    const [interviewerId, setInterviewerId] = useState<number | undefined>();
    const [postingId, setPostingId] = useState<number | undefined>();

    const [interviewers, setInterviewers] = useState<UserDirectoryResponse[]>([]);
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});

    const [selected, setSelected] = useState<InterviewResponse | null>(null);
    const [quickCreate, setQuickCreate] = useState<{ open: boolean; start: Dayjs | null }>({ open: false, start: null });
    const [bulkOpen, setBulkOpen] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);

    const applicationIdParam = searchParams.get("applicationId");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getInterviews(applicationIdParam ? Number(applicationIdParam) : undefined);
            setInterviews(res.data);
        } catch {
            message.error("Không tải được lịch phỏng vấn");
        } finally {
            setLoading(false);
        }
    }, [applicationIdParam, message]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (isHr) {
            Promise.all([getUserDirectory("HIRING_MANAGER"), getUserDirectory("RECRUITER")])
                .then(([a, b]) => setInterviewers([...a.data, ...b.data]))
                .catch(() => setInterviewers([]));
        }
        getPostings({ size: 200 }).then((r) => setPostings(r.data.content)).catch(() => setPostings([]));
        getCatalogItems("/masterdata/work-locations")
            .then((r) => setWorkLocationMap(Object.fromEntries(r.data.map((w) => [w.id, String(w.name)]))))
            .catch(() => setWorkLocationMap({}));
    }, [isHr]);

    // Mở đúng buổi khi đến từ thông báo (?highlightId=)
    useEffect(() => {
        const highlightId = searchParams.get("highlightId");
        if (!highlightId || interviews.length === 0) return;
        const target = interviews.find((i) => i.id === Number(highlightId));
        if (target) setSelected(target);
        const next = new URLSearchParams(searchParams);
        next.delete("highlightId");
        setSearchParams(next, { replace: true });
    }, [interviews, searchParams, setSearchParams]);

    const now = dayjs();
    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return interviews.filter((iv) =>
            (isHr || iv.interviewers.some((p) => p.interviewerId === myId))
            && (!k || iv.candidateName.toLowerCase().includes(k))
            && (interviewerId == null || iv.interviewers.some((p) => p.interviewerId === interviewerId))
            && (postingId == null || iv.jobPostingId === postingId));
    }, [interviews, keyword, interviewerId, postingId, isHr, myId]);

    const tabbed = useMemo(() => filtered.map((iv) => ({ iv, tab: tabOf(iv, now) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtered]);
    const counts = TABS.reduce((m, t) => ({ ...m, [t.key]: tabbed.filter((x) => x.tab === t.key).length }), {} as Record<Tab, number>);
    // Mặc định: còn việc cần xử lý thì mở tab đó, không thì "Sắp tới".
    const activeTab: Tab = tab ?? (counts.ACTION > 0 ? "ACTION" : "UPCOMING");

    const hmRows = useMemo(() => filtered.map((iv) => ({ iv, kind: hmKindOf(iv, myId, now) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtered, myId]);
    const hmCounts = HM_TABS.reduce((m, t) => ({
        ...m, [t.key]: t.key === "ALL" ? hmRows.length : hmRows.filter((x) => HM_KIND_TAB[x.kind] === t.key).length,
    }), {} as Record<HmTab, number>);
    const activeHmTab: HmTab = hmTab ?? (hmCounts.ACTION > 0 ? "ACTION" : "UPCOMING");
    const rows = tabbed.filter((x) => x.tab === activeTab)
        .sort((a, b) => {
            const d = dayjs(a.iv.scheduledAt).valueOf() - dayjs(b.iv.scheduledAt).valueOf();
            // Đã xong / đã huỷ: mới nhất lên đầu
            return activeTab === "DONE" || activeTab === "CANCELLED" ? -d : d;
        });

    // Nhóm theo ngày
    const groups: { day: string; label: string; items: typeof rows }[] = [];
    rows.forEach((r) => {
        const d = dayjs(r.iv.scheduledAt);
        const key = d.format("YYYY-MM-DD");
        let g = groups.find((x) => x.day === key);
        if (!g) {
            const base = `${WEEKDAY[d.day()]} ${d.format(d.isSame(now, "year") ? "DD/MM" : "DD/MM/YYYY")}`;
            g = { day: key, label: d.isSame(now, "day") ? `Hôm nay · ${base}` : base, items: [] };
            groups.push(g);
        }
        g.items.push(r);
    });

    // Đại diện phòng ban: tab Cần xử lý nhóm theo loại việc, các tab khác nhóm theo ngày.
    const hmGroups: { key: string; label: string; items: { iv: InterviewResponse; kind: HmKind }[] }[] = [];
    if (!isHr) {
        const newestFirst = activeHmTab === "DONE" || activeHmTab === "ALL";
        const shown = hmRows.filter((x) => activeHmTab === "ALL" || HM_KIND_TAB[x.kind] === activeHmTab)
            .sort((a, b) => {
                const d = dayjs(a.iv.scheduledAt).valueOf() - dayjs(b.iv.scheduledAt).valueOf();
                return newestFirst ? -d : d;
            });
        if (activeHmTab === "ACTION") {
            (["EVAL", "CONFIRM"] as HmKind[]).forEach((k) => {
                const items = shown.filter((x) => x.kind === k);
                if (items.length) hmGroups.push({ key: k, label: `${HM_KIND_GROUP[k]} · ${items.length}`, items });
            });
        } else {
            shown.forEach((x) => {
                const d = dayjs(x.iv.scheduledAt);
                const key = d.format("YYYY-MM-DD");
                let g = hmGroups.find((y) => y.key === key);
                if (!g) {
                    const base = `${WEEKDAY[d.day()]} ${d.format(d.isSame(now, "year") ? "DD/MM" : "DD/MM/YYYY")}`;
                    g = { key, label: d.isSame(now, "day") ? `Hôm nay · ${base}` : base, items: [] };
                    hmGroups.push(g);
                }
                g.items.push(x);
            });
        }
    }

    const confirm = async (iv: InterviewResponse) => {
        setConfirming(iv.id);
        try {
            await confirmInterviewByHm(iv.id);
            message.success(`Đã xác nhận buổi phỏng vấn ${iv.candidateName}`);
            void load();
        } catch (err) {
            const e = err as AxiosError<{ message?: string }>;
            message.error(e.response?.data?.message ?? "Xác nhận thất bại");
        } finally {
            setConfirming(null);
        }
    };

    const sessionDisplayById = useMemo(() => {
        const sizes = new Map<number, number>();
        interviews.forEach((iv) => { if (iv.sessionId != null) sizes.set(iv.sessionId, (sizes.get(iv.sessionId) ?? 0) + 1); });
        const m = new Map<number, SessionDisplay>();
        sizes.forEach((size, id) => m.set(id, { size, accent: sessionAccent(id) }));
        return m;
    }, [interviews]);

    const createMenu: MenuProps["items"] = [
        { key: "single", icon: <UserOutlined />, label: "1 ứng viên — chọn giờ cụ thể" },
        { key: "bulk", icon: <ThunderboltOutlined />, label: "Nhiều ứng viên — tự chia khung giờ" },
    ];

    const weekStart = weekAnchor.startOf("week");
    const weekEnd = weekAnchor.endOf("week");
    const weekLabel = weekStart.isSame(weekEnd, "month")
        ? `${weekStart.format("DD")} – ${weekEnd.format("DD/MM/YYYY")}`
        : `${weekStart.format("DD/MM")} – ${weekEnd.format("DD/MM/YYYY")}`;

    const gridCols = "90px 1.4fr 1.4fr 130px 200px";

    return (
        <ListPage
            title="Lịch phỏng vấn"
            subtitle={isHr ? undefined : "Các buổi bạn được phân công phỏng vấn"}
            actions={isHr ? (
                <Dropdown menu={{
                    items: createMenu,
                    onClick: ({ key }) => (key === "bulk" ? setBulkOpen(true) : setQuickCreate({ open: true, start: null })),
                }}>
                    <Button type="primary" icon={<PlusOutlined />}>Lên lịch</Button>
                </Dropdown>
            ) : undefined}
            tabs={view === "list" && !isHr ? (
                <StatusTabs<HmTab>
                    active={activeHmTab}
                    onChange={setHmTab}
                    items={HM_TABS.map((t) => ({ key: t.key, label: t.label, count: hmCounts[t.key] }))}
                />
            ) : view === "list" ? (
                <StatusTabs<Tab>
                    active={activeTab}
                    onChange={setTab}
                    items={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
                />
            ) : undefined}
            filters={
                <ListFilters extra={
                    <Space size={8}>
                        {postingId != null && (
                            <Button icon={<SwapOutlined />} onClick={() => setCompareOpen(true)}>So sánh ứng viên</Button>
                        )}
                        <Segmented
                            value={view}
                            onChange={(v) => setView(v as "list" | "week")}
                            options={[{ value: "list", label: "Danh sách" }, { value: "week", label: "Lịch tuần" }]}
                        />
                    </Space>
                }>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo tên ứng viên"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 240 }}
                    />
                    {isHr && (
                        <Select
                            allowClear showSearch optionFilterProp="label"
                            placeholder="Người phỏng vấn"
                            style={{ width: 200 }}
                            value={interviewerId}
                            onChange={setInterviewerId}
                            options={interviewers.map((u) => ({ value: u.id, label: u.fullName }))}
                        />
                    )}
                    <Select
                        allowClear showSearch optionFilterProp="label"
                        placeholder="Việc làm"
                        style={{ width: 220 }}
                        value={postingId}
                        onChange={setPostingId}
                        options={postings.map((p) => ({ value: p.id, label: p.title }))}
                    />
                </ListFilters>
            }
        >
            {view === "week" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Space size={8}>
                        <Tooltip title="Tuần trước"><Button icon={<LeftOutlined />} onClick={() => setWeekAnchor((d) => d.subtract(1, "week"))} /></Tooltip>
                        <Button onClick={() => setWeekAnchor(dayjs())}>Tuần này</Button>
                        <Tooltip title="Tuần sau"><Button icon={<RightOutlined />} onClick={() => setWeekAnchor((d) => d.add(1, "week"))} /></Tooltip>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{weekLabel}</span>
                    </Space>
                    <div style={{ background: COLORS.cardBg, borderRadius: 20, overflow: "hidden", height: "calc(100vh - 300px)", minHeight: 420, display: "flex", flexDirection: "column" }}>
                        <InterviewTimeGrid
                            interviews={filtered}
                            mode="week"
                            anchorDate={weekAnchor}
                            workLocationMap={workLocationMap}
                            sessionDisplayById={sessionDisplayById}
                            onSelectInterview={setSelected}
                            onSelectEmptySlot={isHr ? (start) => setQuickCreate({ open: true, start }) : undefined}
                        />
                    </div>
                </div>
            ) : !isHr ? (
                <div style={{ background: COLORS.cardBg, borderRadius: 20, padding: "8px 20px 16px" }}>
                    <div style={{
                        display: "grid", gridTemplateColumns: HM_COLS, gap: 12, padding: "10px 0",
                        fontSize: 12, color: COLORS.textSecondary, borderBottom: `0.5px solid ${COLORS.border}`,
                    }}>
                        <span>Thời gian</span><span>Ứng viên</span><span>Phỏng vấn cùng</span><span>Hình thức</span><span>Trạng thái</span>
                    </div>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
                    ) : hmGroups.length === 0 ? (
                        <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textSecondary }}>Không có buổi phỏng vấn nào</div>
                    ) : hmGroups.map((g) => (
                        <div key={g.key}>
                            <div style={{ fontSize: 13, fontWeight: 600, padding: "14px 0 6px" }}>{g.label}</div>
                            {g.items.map(({ iv, kind }) => {
                                const st = hmStatusText(iv, kind, myId);
                                const at = dayjs(iv.scheduledAt);
                                const others = iv.interviewers.filter((p) => p.interviewerId !== myId);
                                const postingTitle = postings.find((p) => p.id === iv.jobPostingId)?.title;
                                return (
                                    <div
                                        key={iv.id}
                                        onClick={() => setSelected(iv)}
                                        className="row-clickable"
                                        style={{
                                            cursor: "pointer", display: "grid", gridTemplateColumns: HM_COLS, gap: 12, alignItems: "center",
                                            padding: "10px 0", borderTop: `0.5px solid ${COLORS.border}`, opacity: kind === "CANCELLED" ? 0.6 : 1,
                                        }}
                                    >
                                        <span style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>
                                                {at.isSame(now, "day") ? "Hôm nay" : `${WEEKDAY_SHORT[at.day()]} ${at.format("DD/MM")}`} {at.format("HH:mm")}
                                            </span>
                                            <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{iv.durationMinutes} phút</span>
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                            <Avatar name={iv.candidateName} colorKey={iv.candidateId} size={28} />
                                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{iv.candidateName}</span>
                                                <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {postingTitle ?? ""}
                                                </span>
                                            </span>
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                            {others.length > 0 ? (
                                                <>
                                                    <AvatarGroup people={others.map((p) => ({ name: p.fullName, key: p.interviewerId }))} />
                                                    <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {others.map((p) => p.fullName).join(", ")}
                                                    </span>
                                                </>
                                            ) : <span style={{ fontSize: 12, color: COLORS.textMuted }}>Chỉ mình bạn</span>}
                                        </span>
                                        <span style={{ fontSize: 13 }}>
                                            {iv.format === "ONLINE" ? "Trực tuyến" : (iv.workLocationId ? workLocationMap[iv.workLocationId] : null) ?? "Tại văn phòng"}
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                                            <StatusTag label={st.label} tone={st.tone} />
                                            {kind === "EVAL" && iv.candidateId != null && (
                                                <Button size="small" type="primary"
                                                    onClick={() => navigate(`/candidates/${iv.candidateId}/applications/${iv.applicationId}/evaluate?interviewId=${iv.id}`)}>
                                                    Viết đánh giá
                                                </Button>
                                            )}
                                            {kind === "CONFIRM" && (
                                                <>
                                                    <Button size="small" type="primary" loading={confirming === iv.id} onClick={() => void confirm(iv)}>Xác nhận</Button>
                                                    <Button size="small" onClick={() => setSelected(iv)}>Đề xuất giờ khác</Button>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ background: COLORS.cardBg, borderRadius: 20, padding: "8px 20px 16px" }}>
                    <div style={{
                        display: "grid", gridTemplateColumns: gridCols, gap: 12, padding: "10px 0",
                        fontSize: 12, color: COLORS.textSecondary, borderBottom: `0.5px solid ${COLORS.border}`,
                    }}>
                        <span>Giờ</span><span>Ứng viên</span><span>Người phỏng vấn</span><span>Hình thức</span><span>Trạng thái</span>
                    </div>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
                    ) : groups.length === 0 ? (
                        <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textSecondary }}>Không có buổi phỏng vấn nào</div>
                    ) : groups.map((g) => (
                        <div key={g.day}>
                            <div style={{ fontSize: 13, fontWeight: 600, padding: "14px 0 6px" }}>{g.label}</div>
                            {g.items.map(({ iv, tab: t }) => {
                                const st = statusText(iv, t);
                                const postingTitle = postings.find((p) => p.id === iv.jobPostingId)?.title;
                                return (
                                    <button
                                        key={iv.id}
                                        type="button"
                                        onClick={() => setSelected(iv)}
                                        className="row-clickable"
                                        style={{
                                            all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%",
                                            display: "grid", gridTemplateColumns: gridCols, gap: 12, alignItems: "center",
                                            padding: "10px 0", borderTop: `0.5px solid ${COLORS.border}`,
                                            opacity: t === "CANCELLED" ? 0.6 : 1,
                                        }}
                                    >
                                        <span style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{dayjs(iv.scheduledAt).format("HH:mm")}</span>
                                            <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{iv.durationMinutes} phút</span>
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                            <Avatar name={iv.candidateName} colorKey={iv.candidateId} size={28} />
                                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{iv.candidateName}</span>
                                                <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {postingTitle ?? ""}
                                                </span>
                                            </span>
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                            <AvatarGroup people={iv.interviewers.map((p) => ({ name: p.fullName, key: p.interviewerId }))} />
                                            <span style={{ fontSize: 12, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {iv.interviewers.map((p) => p.fullName).join(", ")}
                                            </span>
                                        </span>
                                        <span style={{ fontSize: 13 }}>
                                            {iv.format === "ONLINE" ? "Trực tuyến" : (iv.workLocationId ? workLocationMap[iv.workLocationId] : null) ?? "Tại văn phòng"}
                                        </span>
                                        <span><StatusTag label={st.label} tone={st.tone} /></span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            <InterviewDetailModal
                open={selected != null}
                interview={selected}
                onClose={() => setSelected(null)}
                onChanged={() => void load()}
            />
            <InterviewQuickCreateModal
                open={quickCreate.open}
                defaultStart={quickCreate.start}
                onClose={() => setQuickCreate({ open: false, start: null })}
                onSuccess={() => void load()}
            />
            <BulkScheduleModal open={bulkOpen} onClose={() => setBulkOpen(false)} onSuccess={() => void load()} />
            <Modal
                title={`So sánh ứng viên · ${postings.find((p) => p.id === postingId)?.title ?? ""}`}
                open={compareOpen}
                onCancel={() => setCompareOpen(false)}
                footer={null}
                width="min(2200px, 98vw)"
                style={{ top: 16 }}
                destroyOnHidden
            >
                {postingId != null && <CandidateComparisonPanel jobPostingId={postingId} showHeader={false} />}
            </Modal>
        </ListPage>
    );
}
