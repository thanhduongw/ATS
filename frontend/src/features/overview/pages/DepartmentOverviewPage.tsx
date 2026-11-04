import { useMemo, useState } from "react";
import { Select, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import type { JobPostingResponse } from "../../recruitment/types";
import { COLORS, STAGE_COLORS } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { InlineNotice, MetricCard, ScreenTitle } from "../../../components/ui/designKit";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import {
    MAIN_STAGES, avgDaysToHire, departmentLabel, departmentOfPosting, hiredOf, inPeriod, isActivePosting, periodOptions, useCompanyOverview,
} from "../useCompanyOverview";

/**
 * A02 · Số liệu một phòng ban (Quản trị doanh nghiệp) — chỉ số liệu, bấm dòng không mở được hồ sơ.
 * Khác HTML: không có số nhân sự của phòng (Q5); cột "Đại diện phòng ban" là người tạo yêu cầu tuyển dụng của vị trí.
 */
export default function DepartmentOverviewPage() {
    const { id } = useParams();
    const deptId = Number(id);
    const data = useCompanyOverview();
    const periods = useMemo(() => periodOptions(), []);
    const [periodKey, setPeriodKey] = useState(periods[0].key);
    const period = periods.find((p) => p.key === periodKey) ?? periods[0];

    const v = useMemo(() => {
        const reqById = new Map(data.requisitions.map((r) => [r.id, r]));
        const postings = data.postings
            .filter((p) => p.publishedAt && departmentOfPosting(p, reqById) === deptId)
            .sort((a, b) => Number(isActivePosting(b)) - Number(isActivePosting(a))
                || dayjs(b.publishedAt).valueOf() - dayjs(a.publishedAt).valueOf());
        const ids = new Set(postings.map((p) => p.id));
        const apps = data.applications.filter((a) => ids.has(a.jobPostingId));
        const appsOf = (pid: number) => apps.filter((a) => a.jobPostingId === pid);
        const active = postings.filter(isActivePosting);
        return {
            reqById, postings, appsOf,
            open: postings.filter((p) => p.status === "OPEN").length,
            remaining: active.reduce((s, p) => s + Math.max(0, (p.headcount ?? 0) - hiredOf(appsOf(p.id)).length), 0),
            hired: hiredOf(apps).filter((a) => inPeriod(a.hiredAt, period)).length,
            avgDays: avgDaysToHire(apps, new Map(postings.map((p) => [p.id, p])), period),
        };
    }, [data, deptId, period]);

    if (data.loading) return <div style={{ padding: 60, textAlign: "center" }}><Spin /></div>;
    const dept = data.departments.find((d) => d.id === deptId);
    if (!dept) return <InlineNotice tone="danger">Không tìm thấy phòng ban này.</InlineNotice>;
    const rep = data.users.find((u) => u.role === "HIRING_MANAGER" && u.status === "ACTIVE" && u.departmentId === deptId);

    const openedText = (p: JobPostingResponse) => {
        const h = hiredOf(v.appsOf(p.id)).length;
        const end = p.closedAt ? dayjs(p.closedAt) : dayjs();
        const days = end.diff(dayjs(p.publishedAt), "day");
        if (p.headcount && h >= p.headcount) return `Đã đủ · ${days} ngày`;
        if (p.status === "PAUSED") return "Tạm dừng";
        if (p.status === "CLOSED") return `Đã đóng · ${days} ngày`;
        return `${days} ngày`;
    };

    const columns: ColumnsType<JobPostingResponse> = [
        { title: "Vị trí", dataIndex: "title", render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span> },
        { title: "Đại diện phòng ban", key: "req", width: 170, render: (_, p) => v.reqById.get(p.requisitionId)?.requesterName ?? "—" },
        { title: "Đã tuyển", key: "hired", width: 100, render: (_, p) => <b>{hiredOf(v.appsOf(p.id)).length}/{p.headcount ?? "?"}</b> },
        {
            title: "Ứng viên theo giai đoạn", key: "stages",
            render: (_, p) => {
                const apps = v.appsOf(p.id);
                return (
                    <div style={{ display: "flex", gap: 14 }}>
                        {MAIN_STAGES.map((s) => {
                            const n = apps.filter((a) => toFixedStage(a.currentStageType) === s).length;
                            return (
                                <div key={s} style={{ display: "flex", flexDirection: "column", minWidth: 44 }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: n ? STAGE_COLORS[s].color : COLORS.textMuted }}>{n}</span>
                                    <span style={{ fontSize: 11, color: COLORS.textSecondary, whiteSpace: "nowrap" }}>{FIXED_STAGE_LABEL[s]}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            },
        },
        { title: "Thời gian mở", key: "opened", width: 150, render: (_, p) => openedText(p) },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
                <PageBreadcrumb crumb={departmentLabel(String(dept.name))} />
                <ScreenTitle
                    title={departmentLabel(String(dept.name))}
                    subtitle={rep ? `Đại diện: ${rep.fullName || rep.email}` : "Chưa có đại diện phòng ban"}
                    actions={<>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Thời gian:</span>
                        <Select value={periodKey} onChange={setPeriodKey} style={{ width: 140 }}
                            options={periods.map((p) => ({ value: p.key, label: p.label }))} />
                    </>}
                />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <MetricCard label="Vị trí đang tuyển" value={v.open} />
                <MetricCard label="Còn cần tuyển" value={v.remaining} />
                <MetricCard label={period.from ? "Đã tuyển trong quý" : "Đã tuyển"} value={v.hired} />
                <MetricCard label="Thời gian tuyển trung bình" value={v.avgDays != null ? `${v.avgDays} ngày` : "—"} />
            </div>
            <section style={{ background: COLORS.cardBg, borderRadius: 20, overflow: "hidden" }}>
                <Table<JobPostingResponse>
                    rowKey="id"
                    columns={columns}
                    dataSource={v.postings}
                    pagination={v.postings.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                    locale={{ emptyText: "Phòng chưa đăng việc làm nào" }}
                />
            </section>
        </div>
    );
}
