import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import type { JobPostingResponse } from "../../recruitment/types";
import { POSTING_STATUS_VIEW } from "../../recruitment/postingLabels";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import { shortDate } from "../../../app/datetime";
import { MetricCard, ScreenTitle } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { rowArrowColumn } from "../../../components/ui/listHelpers";
import { departmentLabel } from "../../overview/useCompanyOverview";
import { offerStatusText, useDepartmentResults } from "../useDepartmentResults";

/**
 * H16 · MÀN CHÍNH · Kết quả tuyển dụng (Đại diện phòng ban). Không hiện lương (T1.5).
 * Chưa có bộ chọn kỳ (quý) và phần "so với quý trước" — số liệu tính trên mọi việc làm của phòng.
 * "Tỉ lệ qua phỏng vấn" = hồ sơ đang ở Thư mời / Đã tuyển ÷ hồ sơ đang ở Phỏng vấn trở đi
 * (hồ sơ bị từ chối không biết bị loại ở vòng nào nên không tính).
 */
const MAIN: FixedStage[] = FIXED_STAGES.filter((s) => s !== "REJECTED");

export default function ResultsPage() {
    const navigate = useNavigate();
    const { loading, departmentName, postings, appsByPosting, offerByApp } = useDepartmentResults();

    const allApps = [...appsByPosting.values()].flat();
    const open = postings.filter((p) => p.status === "OPEN");
    const hiredApps = allApps.filter((a) => toFixedStage(a.currentStageType) === "HIRED");
    const headcount = postings.filter((p) => p.status !== "DRAFT").reduce((s, p) => s + (p.headcount ?? 0), 0);
    const lastHired = [...hiredApps].sort((a, b) => dayjs(b.hiredAt ?? 0).valueOf() - dayjs(a.hiredAt ?? 0).valueOf())[0];
    const days = hiredApps.filter((a) => a.hiredAt).map((a) => dayjs(a.hiredAt).diff(dayjs(a.appliedAt), "day"));
    const avgDays = days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
    const pastInterview = allApps.filter((a) => ["INTERVIEW", "OFFER", "HIRED"].includes(toFixedStage(a.currentStageType)));
    const passed = pastInterview.filter((a) => toFixedStage(a.currentStageType) !== "INTERVIEW").length;
    const passRate = pastInterview.length ? Math.round((passed / pastInterview.length) * 100) : null;

    const columns: ColumnsType<JobPostingResponse> = [
        {
            title: "Vị trí", key: "title",
            render: (_, p) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    <StatusTag {...POSTING_STATUS_VIEW[p.status]} />
                </div>
            ),
        },
        {
            title: "Đã tuyển", key: "hired", width: 110,
            render: (_, p) => {
                const h = (appsByPosting.get(p.id) ?? []).filter((a) => toFixedStage(a.currentStageType) === "HIRED").length;
                return <b>{h}/{p.headcount ?? "?"}</b>;
            },
        },
        {
            title: "Ứng viên theo giai đoạn", key: "stages",
            render: (_, p) => {
                const apps = appsByPosting.get(p.id) ?? [];
                return (
                    <div style={{ display: "flex", gap: 14 }}>
                        {MAIN.map((s) => {
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
        {
            title: "Thư mời", key: "offer", width: 170,
            render: (_, p) => {
                const texts = (appsByPosting.get(p.id) ?? []).map((a) => offerStatusText(offerByApp.get(a.id))).filter(Boolean);
                return texts.length ? texts[0] : <span style={{ color: COLORS.textMuted }}>—</span>;
            },
        },
        { title: "Ngày đăng", key: "published", width: 120, render: (_, p) => shortDate(p.publishedAt) },
        rowArrowColumn,
    ];

    const rows = postings.filter((p) => p.status !== "DRAFT" && p.status !== "EDITING");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle title="Kết quả tuyển dụng" subtitle={departmentName ? departmentLabel(departmentName) : undefined} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetricCard label="Vị trí đang tuyển" value={open.length}
                    hint={`${open.reduce((s, p) => s + (p.headcount ?? 0), 0)} người cần tuyển`} />
                <MetricCard label="Đã tuyển" value={`${hiredApps.length}/${headcount}`} hint={lastHired?.jobTitle ?? "Chưa tuyển được ai"} />
                <MetricCard label="Thời gian tuyển trung bình" value={avgDays != null ? `${avgDays} ngày` : "—"} hint="Từ ngày ứng tuyển đến ngày nhận việc" />
                <MetricCard label="Tỉ lệ qua phỏng vấn" value={passRate != null ? `${passRate}%` : "—"} hint="Hồ sơ đi tiếp sau vòng phỏng vấn" />
            </div>
            <section style={{ background: COLORS.cardBg, borderRadius: 20, overflow: "hidden" }}>
                <Table<JobPostingResponse>
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={rows}
                    pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                    rowClassName={() => "row-clickable"}
                    onRow={(p) => ({ onClick: () => navigate(`/results/${p.id}`) })}
                    locale={{ emptyText: "Phòng chưa có vị trí nào đang tuyển" }}
                />
            </section>
        </div>
    );
}
