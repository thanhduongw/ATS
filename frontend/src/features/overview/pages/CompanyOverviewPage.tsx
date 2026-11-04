import { useMemo, useState } from "react";
import { Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { COLORS, STAGE_COLORS } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { Avatar, InlineNotice, MetricCard, Panel, ScreenTitle } from "../../../components/ui/designKit";
import { rowArrowColumn } from "../../../components/ui/listHelpers";
import {
    avgDaysToHire, deltaText, departmentLabel, departmentOfPosting, funnelOf, hiredOf, inPeriod, isActivePosting,
    periodOptions, previousPeriod, useCompanyOverview,
} from "../useCompanyOverview";

/**
 * A01 · MÀN CHÍNH · Tổng quan (Quản trị doanh nghiệp). Chỉ số liệu tổng hợp — không hiện hồ sơ ứng viên.
 * Khác HTML: khối "Cần chú ý" không có mục "Trang tuyển dụng có bản nháp" (trang tuyển dụng không có bản nháp — A09/A10 bỏ).
 */
interface DeptRow {
    id: number;
    name: string;
    rep: { id: number; name: string } | null;
    openPositions: number;
    remaining: number;
    hired: number;
    headcount: number;
    interviewing: number;
}

const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toString().replace(".", ",")}%` : "—");

export default function CompanyOverviewPage() {
    const navigate = useNavigate();
    const data = useCompanyOverview();
    const periods = useMemo(() => periodOptions(), []);
    const [periodKey, setPeriodKey] = useState(periods[0].key);
    const period = periods.find((p) => p.key === periodKey) ?? periods[0];
    const prev = previousPeriod(period);

    const m = useMemo(() => {
        const { postings, requisitions, applications, offers, departments, users } = data;
        const reqById = new Map(requisitions.map((r) => [r.id, r]));
        const postingById = new Map(postings.map((p) => [p.id, p]));
        const appsByPosting = new Map<number, typeof applications>();
        applications.forEach((a) => appsByPosting.set(a.jobPostingId, [...(appsByPosting.get(a.jobPostingId) ?? []), a]));

        const active = postings.filter(isActivePosting);
        const open = postings.filter((p) => p.status === "OPEN");
        const remainingOf = (ps: typeof postings) => ps.reduce((s, p) =>
            s + Math.max(0, (p.headcount ?? 0) - hiredOf(appsByPosting.get(p.id) ?? []).length), 0);

        const hiredIn = (per: typeof period) => hiredOf(applications).filter((a) => inPeriod(a.hiredAt, per)).length;
        const responded = (per: typeof period) => offers.filter((o) =>
            (o.status === "ACCEPTED" || o.status === "DECLINED") && inPeriod(o.candidateRespondedAt ?? o.issuedAt ?? o.createdAt, per));
        const resp = responded(period);
        const accepted = resp.filter((o) => o.status === "ACCEPTED").length;

        const deptOf = (p: (typeof postings)[number]) => departmentOfPosting(p, reqById);
        const reps = users.filter((u) => u.role === "HIRING_MANAGER" && u.status === "ACTIVE");
        const deptRows: DeptRow[] = departments.filter((d) => d.active).map((d) => {
            const ps = active.filter((p) => deptOf(p) === d.id);
            const apps = ps.flatMap((p) => appsByPosting.get(p.id) ?? []);
            const rep = reps.find((u) => u.departmentId === d.id);
            return {
                id: d.id,
                name: String(d.name),
                rep: rep ? { id: rep.id, name: rep.fullName || rep.email } : null,
                openPositions: ps.filter((p) => p.status === "OPEN").length,
                remaining: remainingOf(ps),
                hired: hiredOf(apps).length,
                headcount: ps.reduce((s, p) => s + (p.headcount ?? 0), 0),
                interviewing: apps.filter((a) => toFixedStage(a.currentStageType) === "INTERVIEW").length,
            };
        }).sort((a, b) => b.openPositions - a.openPositions || b.headcount - a.headcount);

        const pendingInvites = users.filter((u) => u.status === "PENDING_VERIFICATION");
        const noRep = deptRows.filter((r) => !r.rep);

        return {
            openCount: open.length,
            openDepts: new Set(open.map(deptOf).filter((x) => x != null)).size,
            remaining: remainingOf(open),
            hired: hiredIn(period),
            hiredPrev: prev ? hiredIn(prev) : null,
            avgDays: avgDaysToHire(applications, postingById, period),
            avgDaysPrev: prev ? avgDaysToHire(applications, postingById, prev) : null,
            accepted, respondedCount: resp.length,
            funnel: funnelOf(applications, period),
            deptRows, pendingInvites, noRep,
        };
    }, [data, period, prev]);

    const columns: ColumnsType<DeptRow> = [
        { title: "Phòng ban", dataIndex: "name", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
        {
            title: "Đại diện", key: "rep",
            render: (_, r) => r.rep ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={r.rep.name} colorKey={r.rep.id} size={26} />{r.rep.name}
                </span>
            ) : <span style={{ color: COLORS.warning }}>Chưa có đại diện</span>,
        },
        { title: "Vị trí đang tuyển", dataIndex: "openPositions", width: 140, align: "right" },
        { title: "Còn cần tuyển", dataIndex: "remaining", width: 130, align: "right" },
        { title: "Đã tuyển / tổng", key: "hired", width: 140, align: "right", render: (_, r) => `${r.hired}/${r.headcount}` },
        { title: "Đang phỏng vấn", dataIndex: "interviewing", width: 140, align: "right" },
        rowArrowColumn,
    ];

    const max = Math.max(1, m.funnel[0].count);
    const [applied, , interview, offer] = m.funnel.map((f) => f.count);
    const prevLabel = prev ? `so với ${prev.label.replace(/\/\d+$/, "").toLowerCase()}` : undefined;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle
                title="Tổng quan"
                subtitle="Số liệu tổng hợp · không hiển thị hồ sơ ứng viên"
                actions={<>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Thời gian:</span>
                    <Select value={periodKey} onChange={setPeriodKey} style={{ width: 140 }}
                        options={periods.map((p) => ({ value: p.key, label: p.label }))} />
                </>}
            />
            {data.failed && <InlineNotice tone="danger">Không tải được số liệu. Thử tải lại trang.</InlineNotice>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
                <MetricCard label="Vị trí đang tuyển" value={m.openCount} hint={`ở ${m.openDepts} phòng ban`} />
                <MetricCard label="Người cần tuyển" value={m.remaining} hint="theo yêu cầu đã duyệt" />
                <MetricCard label={prev ? "Đã tuyển trong quý" : "Đã tuyển"} value={m.hired}
                    delta={deltaText(m.hired, m.hiredPrev)} deltaGood={m.hiredPrev == null || m.hired >= m.hiredPrev}
                    hint={prevLabel} />
                <MetricCard label="Thời gian tuyển trung bình" value={m.avgDays != null ? `${m.avgDays} ngày` : "—"}
                    delta={deltaText(m.avgDays, m.avgDaysPrev)}
                    deltaGood={m.avgDays == null || m.avgDaysPrev == null || m.avgDays <= m.avgDaysPrev}
                    hint="từ mở tin đến nhận việc" />
                <MetricCard label="Tỉ lệ nhận thư mời" value={m.respondedCount ? `${Math.round((m.accepted / m.respondedCount) * 100)}%` : "—"}
                    hint={`${m.accepted}/${m.respondedCount} thư mời đã phản hồi`} />
            </div>

            <Panel title="Theo phòng ban" extra={<span style={{ fontSize: 13, color: COLORS.textSecondary }}>Việc làm đang mở hoặc tạm dừng</span>} bodyGap={0}>
                <Table<DeptRow>
                    rowKey="id"
                    loading={data.loading}
                    columns={columns}
                    dataSource={m.deptRows}
                    pagination={false}
                    rowClassName={() => "row-clickable"}
                    onRow={(r) => ({ onClick: () => navigate(`/dashboard/departments/${r.id}`) })}
                    locale={{ emptyText: "Chưa có phòng ban nào" }}
                />
            </Panel>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }}>
                <Panel title="Phễu tuyển dụng toàn công ty" subtitle={`Số ứng viên đã đi tới từng giai đoạn · ${period.label}`} bodyGap={10}>
                    {m.funnel.map(({ stage, count }) => (
                        <div key={stage} style={{ display: "grid", gridTemplateColumns: "100px 1fr 48px", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13 }}>{FIXED_STAGE_LABEL[stage]}</span>
                            <div style={{ height: 10, borderRadius: 5, background: COLORS.fill }}>
                                <div style={{ width: `${(count / max) * 100}%`, height: "100%", borderRadius: 5, background: STAGE_COLORS[stage].color }} />
                            </div>
                            <b style={{ textAlign: "right" }}>{count}</b>
                        </div>
                    ))}
                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        Tỉ lệ từ ứng tuyển đến phỏng vấn: {pct(interview, applied)} · Từ phỏng vấn đến thư mời: {pct(offer, interview)}
                    </span>
                </Panel>

                <Panel title="Cần chú ý" bodyGap={8}>
                    {m.pendingInvites.length === 0 && m.noRep.length === 0 && (
                        <span style={{ color: COLORS.textSecondary }}>Không có việc gì cần xử lý.</span>
                    )}
                    {m.pendingInvites.length > 0 && (
                        <InlineNotice tone="warning" action={<a onClick={() => navigate("/admin/users")}>Xem</a>}>
                            <b>{m.pendingInvites.length} lời mời chưa được kích hoạt</b>
                            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {m.pendingInvites.slice(0, 3).map((u) => u.fullName || u.email).join(", ")}
                                {m.pendingInvites.length > 3 ? "…" : ""}
                            </div>
                        </InlineNotice>
                    )}
                    {m.noRep.length > 0 && (
                        <InlineNotice tone="warning" action={<a onClick={() => navigate("/admin/users/invite")}>Mời</a>}>
                            <b>{m.noRep.length === 1 ? `${departmentLabel(m.noRep[0].name)} chưa có đại diện` : `${m.noRep.length} phòng ban chưa có đại diện`}</b>
                            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {m.noRep.length > 1 && <>{m.noRep.slice(0, 4).map((d) => d.name).join(", ")}{m.noRep.length > 4 ? "…" : ""} · </>}
                                Không tạo được yêu cầu tuyển dụng cho {m.noRep.length > 1 ? "các phòng này" : "phòng này"}
                            </div>
                        </InlineNotice>
                    )}
                </Panel>
            </div>
        </div>
    );
}
