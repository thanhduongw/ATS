import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Input, Select} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getPostings, getRequisitions } from "../recruitmentApi";
import { getApplications } from "../../candidate/applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { JobPostingResponse, JobRequisitionResponse, PostingStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS, FIXED_STAGES, STAGE_COLORS, type FixedStage } from "../../../app/theme";
import { FIXED_STAGE_LABEL, toFixedStage } from "../../../app/stages";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { rowArrowColumn } from "../../../components/ui/listHelpers";
import { Avatar } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import FitTable from "../../../components/ui/FitTable";
import { POSTING_FILLED_VIEW, POSTING_STATUS_VIEW, WORK_ARRANGEMENT_LABEL } from "../postingLabels";

/**
 * R06 · MÀN CHÍNH · Việc làm — danh sách.
 * Tab theo vòng đời tin; tin HR đã xác nhận, chưa đăng (APPROVED) gọi là "Chờ duyệt" như mẫu (Q2).
 * Cột cuối "Hạn nộp": số ngày còn lại của tin đang tuyển, "—" cho tin khác hoặc tin không đặt hạn.
 * Tin đang tuyển đã tuyển đủ số cần hiện "Đã đủ người".
 */
type Tab = "OPEN" | "APPROVED" | "DRAFT" | "PAUSED" | "CLOSED" | "ALL";
const TAB_STATUSES: Record<Exclude<Tab, "ALL">, PostingStatus[]> = {
    OPEN: ["OPEN"], APPROVED: ["APPROVED"], DRAFT: ["DRAFT", "EDITING"], PAUSED: ["PAUSED"], CLOSED: ["CLOSED"],
};
const TAB_LABEL: Record<Tab, string> = {
    OPEN: "Đang tuyển", APPROVED: "Chờ duyệt", DRAFT: "Bản nháp", PAUSED: "Tạm dừng", CLOSED: "Đã đóng", ALL: "Tất cả",
};
const MAIN_STAGES = FIXED_STAGES.filter((s) => s !== "REJECTED");
const DAY = 86_400_000;

/** "34 ngày" / "Hết hạn" / "—". Hạn nộp là ngày (yyyy-MM-dd): còn hạn tới hết ngày đó. */
function deadlineText(p: JobPostingResponse, now: number): string {
    if (p.status !== "OPEN" || !p.applicationDeadline) return "—";
    const end = new Date(`${p.applicationDeadline}T23:59:59`).getTime();
    const days = Math.ceil((end - now) / DAY) - 1;
    return days < 0 ? "Hết hạn" : `${days} ngày`;
}

export default function PostingListPanel() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const canManage = !!role && HR_ROLES.includes(role);

    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [requisitions, setRequisitions] = useState<Map<number, JobRequisitionResponse>>(new Map());
    const [stageCounts, setStageCounts] = useState<Map<number, Partial<Record<FixedStage, number>>>>(new Map());
    const [departments, setDepartments] = useState<Record<number, string>>({});
    const [locations, setLocations] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("OPEN");
    const [keyword, setKeyword] = useState("");
    const [departmentId, setDepartmentId] = useState<number | undefined>();
    const [now] = useState(() => Date.now());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, r, a, d, l] = await Promise.all([
                getPostings({ size: 1000 }),
                getRequisitions({ size: 1000 }),
                getApplications({ size: 5000 }),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/work-locations"),
            ]);
            setPostings(p.data.content);
            setRequisitions(new Map(r.data.content.map((x) => [x.id, x])));
            const m = new Map<number, Partial<Record<FixedStage, number>>>();
            a.data.content.forEach((app) => {
                const c = m.get(app.jobPostingId) ?? {};
                const s = toFixedStage(app.currentStageType);
                c[s] = (c[s] ?? 0) + 1;
                m.set(app.jobPostingId, c);
            });
            setStageCounts(m);
            setDepartments(Object.fromEntries(d.data.map((x) => [x.id, String(x.name)])));
            setLocations(Object.fromEntries(l.data.map((x) => [x.id, String(x.name)])));
        } catch {
            message.error("Không tải được danh sách việc làm");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { void load(); }, [load]);

    const deptOf = useCallback((p: JobPostingResponse) =>
        p.departmentId ?? requisitions.get(p.requisitionId)?.departmentId ?? null, [requisitions]);

    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return postings.filter((p) => (!k || p.title.toLowerCase().includes(k))
            && (departmentId == null || deptOf(p) === departmentId));
    }, [postings, keyword, departmentId, deptOf]);

    const inTab = (p: JobPostingResponse, t: Tab) => t === "ALL" || TAB_STATUSES[t].includes(p.status);
    const rows = filtered.filter((p) => inTab(p, tab));
    const tabs: Tab[] = ["OPEN", "APPROVED", "DRAFT", "PAUSED", "CLOSED", "ALL"];

    const columns: ColumnsType<JobPostingResponse> = [
        {
            title: "Việc làm", key: "title",
            render: (_, p) => {
                const dept = deptOf(p);
                const meta = [
                    dept != null ? departments[dept] : null,
                    locations[p.workLocationId],
                    p.workArrangement ? WORK_ARRANGEMENT_LABEL[p.workArrangement] : null,
                    p.headcount ? `${p.headcount} vị trí` : null,
                ].filter(Boolean).join(" · ");
                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{p.title}</span>
                        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{meta}</span>
                    </div>
                );
            },
        },
        {
            title: "Trạng thái", key: "status", width: 130,
            render: (_, p) => {
                const hired = stageCounts.get(p.id)?.HIRED ?? 0;
                const filled = p.status === "OPEN" && (p.headcount ?? 0) > 0 && hired >= (p.headcount ?? 0);
                return <StatusTag {...(filled ? POSTING_FILLED_VIEW : POSTING_STATUS_VIEW[p.status])} />;
            },
        },
        {
            title: "Đại diện phòng ban", key: "rep", width: 200,
            render: (_, p) => {
                const r = requisitions.get(p.requisitionId);
                return r ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Avatar name={r.requesterName} colorKey={r.requesterId} size={24} />{r.requesterName}
                    </span>
                ) : "—";
            },
        },
        {
            title: "Ứng viên theo giai đoạn", key: "stages",
            render: (_, p) => {
                const c = stageCounts.get(p.id) ?? {};
                return (
                    <div style={{ display: "flex", gap: 14 }}>
                        {MAIN_STAGES.map((s) => (
                            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 44 }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: (c[s] ?? 0) > 0 ? STAGE_COLORS[s].color : COLORS.textMuted }}>
                                    {c[s] ?? 0}
                                </span>
                                <span style={{ fontSize: 11, color: COLORS.textSecondary, whiteSpace: "nowrap" }}>{FIXED_STAGE_LABEL[s]}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        { title: "Hạn nộp", key: "deadline", width: 110, render: (_, p) => deadlineText(p, now) },
        rowArrowColumn,
    ];

    return (
        <ListPage
            title="Việc làm"
            actions={canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/recruitment/postings/new")}>Tạo việc làm</Button> : undefined}
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={tabs.map((t) => ({ key: t, label: TAB_LABEL[t], count: filtered.filter((p) => inTab(p, t)).length }))}
                />
            }
            filters={
                <ListFilters>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo tên việc làm"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        placeholder="Phòng ban"
                        style={{ width: 220 }}
                        value={departmentId}
                        onChange={setDepartmentId}
                        options={Object.entries(departments).map(([id, name]) => ({ value: Number(id), label: name }))}
                    />
                </ListFilters>
            }
            footnote={`${rows.length} việc làm`}
        >
            <FitTable<JobPostingResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                rowClassName={() => "row-clickable"}
                onRow={(p) => ({ onClick: () => navigate(`/recruitment/postings/${p.id}`) })}
                locale={{ emptyText: "Không có việc làm nào" }}
            />
        </ListPage>
    );
}
