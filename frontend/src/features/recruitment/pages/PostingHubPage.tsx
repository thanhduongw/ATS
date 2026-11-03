import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Input, Modal, Segmented, Select, Space, Spin, Table, Tabs } from "antd";
import { EditOutlined, ExportOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
    getPostingById, getRequisitionById, changePostingStatus,
    submitPostingForReview, requestPostingEdit, publishPosting,
} from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineStageResponse } from "../../masterdata/types";
import { getApplications } from "../../candidate/applicationApi";
import { getInterviews } from "../../interview/interviewApi";
import type { InterviewResponse } from "../../interview/types";
import { getOffers } from "../../offer/offerApi";
import type { OfferResponse } from "../../offer/types";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse } from "../types";
import type { ApplicationResponse } from "../../candidate/types";
import ApplicationKanbanBoard from "../../candidate/components/ApplicationKanbanBoard";
import ApplicationCreateModal from "../../candidate/components/ApplicationCreateModal";
import CandidateComparisonPanel from "../../offer/components/CandidateComparisonPanel";
import PostingFormModal from "../components/PostingFormModal";
import { POSTING_STATUS_VIEW, WORK_ARRANGEMENT_LABEL } from "../postingLabels";
import { AI_TIER_OPTIONS } from "../../ai/aiScore";
import AiScoreBadge from "../../ai/components/AiScoreBadge";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";
import { fullDate } from "../../../app/datetime";
import { useTrailNavigate } from "../../../app/useNavTrail";
import StageTag from "../../../components/ui/StageTag";
import StatusTag from "../../../components/ui/StatusTag";
import { Avatar, Panel } from "../../../components/ui/designKit";
import { rowArrowColumn } from "../../../components/ui/listHelpers";
import { formatSalaryShort } from "../../../app/money";


function fmtStamp(v: string) {
    return new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Khối văn bản nhiều dòng của nội dung tin. */
function TextBlock({ title, value }: { title: string; value: string | null }) {
    if (!value) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
            <span style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</span>
        </div>
    );
}

/**
 * R09 · Trang việc làm — tiêu đề + thao tác, dòng thông tin, 3 tab: Ứng viên · Nội dung tin · Hoạt động.
 * Tab Ứng viên mặc định "Theo giai đoạn" (bảng kéo thả), có thể đổi sang "Danh sách".
 */
export default function PostingHubPage() {
    const { id } = useParams();
    const jobPostingId = Number(id);
    const navigate = useNavigate();
    const goToApplication = useTrailNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const canManage = !!role && HR_ROLES.includes(role);

    const [posting, setPosting] = useState<JobPostingResponse | null>(null);
    const [requisition, setRequisition] = useState<JobRequisitionResponse | null>(null);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [stages, setStages] = useState<PipelineStageResponse[]>([]);
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [offers, setOffers] = useState<OfferResponse[]>([]);
    const [catalog, setCatalog] = useState<{ dept: Record<number, string>; loc: Record<number, string>; emp: Record<number, string> }>(
        { dept: {}, loc: {}, emp: {} });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [view, setView] = useState<"board" | "list">("board");
    const [keyword, setKeyword] = useState("");
    const [aiTier, setAiTier] = useState<string | undefined>();
    const [recruiterId, setRecruiterId] = useState<number | undefined>();
    const [compareOpen, setCompareOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const loadAll = useCallback(async () => {
        if (!jobPostingId) return;
        try {
            const [p, apps, pipes] = await Promise.all([
                getPostingById(jobPostingId),
                getApplications({ jobPostingId, size: 2000 }),
                getPipelines(),
            ]);
            setPosting(p.data);
            setApplications(apps.data.content);
            const pipe = pipes.data.find((x) => x.id === p.data.pipelineId);
            setStages(pipe ? [...pipe.stages].sort((a, b) => a.stageOrder - b.stageOrder) : []);
            // Phần phụ: lỗi không chặn trang.
            getRequisitionById(p.data.requisitionId).then((r) => setRequisition(r.data)).catch(() => setRequisition(null));
            getInterviews(undefined).then((r) => setInterviews(r.data.filter((iv) => iv.jobPostingId === jobPostingId))).catch(() => setInterviews([]));
            if (canManage) {
                getOffers({ jobPostingId, size: 500 }).then((r) => setOffers(r.data.content)).catch(() => setOffers([]));
            }
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được việc làm");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, canManage, message]);

    useEffect(() => { void loadAll(); }, [loadAll]);

    useEffect(() => {
        const toMap = (xs: CatalogItem[]) => Object.fromEntries(xs.map((x) => [x.id, String(x.name)]));
        Promise.all([
            getCatalogItems("/masterdata/departments"),
            getCatalogItems("/masterdata/work-locations"),
            getCatalogItems("/masterdata/employment-types"),
        ]).then(([d, l, e]) => setCatalog({ dept: toMap(d.data), loc: toMap(l.data), emp: toMap(e.data) })).catch(() => undefined);
    }, []);

    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return applications.filter((a) => (!k || a.candidateName.toLowerCase().includes(k))
            && (!aiTier || a.aiTier === aiTier)
            && (recruiterId == null || a.assignedRecruiterId === recruiterId));
    }, [applications, keyword, aiTier, recruiterId]);

    const recruiterOptions = useMemo(() => {
        const m = new Map<number, string>();
        applications.forEach((a) => { if (a.assignedRecruiterId && a.assignedRecruiterName) m.set(a.assignedRecruiterId, a.assignedRecruiterName); });
        return [...m].map(([value, label]) => ({ value, label }));
    }, [applications]);

    const runAction = async (action: () => Promise<unknown>, ok: string) => {
        setActionLoading(true);
        try {
            await action();
            message.success(ok);
            void loadAll();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thao tác thất bại");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !posting) return <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>;
    if (!posting) return <div style={{ padding: 40, color: COLORS.textSecondary }}>Không tìm thấy việc làm.</div>;

    const deptId = posting.departmentId ?? requisition?.departmentId ?? null;
    const meta = [
        deptId != null ? catalog.dept[deptId] : null,
        catalog.loc[posting.workLocationId],
        posting.workArrangement ? WORK_ARRANGEMENT_LABEL[posting.workArrangement] : null,
        posting.headcount ? `Tuyển ${posting.headcount}` : null,
        requisition ? `Đại diện phòng ban: ${requisition.requesterName}` : null,
    ].filter(Boolean).join(" · ");

    const statusActions: ReactNode = !canManage ? null : (() => {
        switch (posting.status) {
            case "DRAFT":
            case "EDITING":
                return <Button type="primary" loading={actionLoading} onClick={() => runAction(() => submitPostingForReview(posting.id), "Đã xác nhận nội dung tin")}>Xác nhận nội dung</Button>;
            case "APPROVED":
                return (
                    <>
                        <Button loading={actionLoading} onClick={() => runAction(() => requestPostingEdit(posting.id), "Đã chuyển tin về bản nháp")}>Sửa lại</Button>
                        <Button type="primary" loading={actionLoading} onClick={() => runAction(() => publishPosting(posting.id), "Đã đăng tin")}>Đăng tin</Button>
                    </>
                );
            case "OPEN":
                return (
                    <>
                        <Button loading={actionLoading} onClick={() => runAction(() => changePostingStatus(posting.id, { status: "PAUSED" }), "Đã tạm dừng tin")}>Tạm dừng</Button>
                        <Button danger loading={actionLoading} onClick={() => runAction(() => changePostingStatus(posting.id, { status: "CLOSED" }), "Đã đóng tin")}>Đóng tin</Button>
                    </>
                );
            case "PAUSED":
                return (
                    <>
                        <Button type="primary" loading={actionLoading} onClick={() => runAction(() => changePostingStatus(posting.id, { status: "OPEN" }), "Đã mở lại tin")}>Mở lại</Button>
                        <Button danger loading={actionLoading} onClick={() => runAction(() => changePostingStatus(posting.id, { status: "CLOSED" }), "Đã đóng tin")}>Đóng tin</Button>
                    </>
                );
            default:
                return null;
        }
    })();

    const listColumns: ColumnsType<ApplicationResponse> = [
        {
            title: "Ứng viên", key: "name",
            render: (_, a) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={a.candidateName} colorKey={a.candidateId} size={28} />
                    <span style={{ fontWeight: 600 }}>{a.candidateName}</span>
                </span>
            ),
        },
        { title: "Giai đoạn", key: "stage", width: 150, render: (_, a) => <StageTag stageType={a.currentStageType} /> },
        { title: "Điểm AI", key: "ai", width: 170, render: (_, a) => <AiScoreBadge score={a.aiScore} tier={a.aiTier} status={a.aiStatus} /> },
        { title: "Phụ trách", key: "rec", width: 180, render: (_, a) => a.assignedRecruiterName ?? "—" },
        { title: "Ngày ứng tuyển", key: "applied", width: 130, render: (_, a) => fullDate(a.appliedAt) },
        rowArrowColumn,
    ];

    const candidatesTab = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Input
                    allowClear
                    prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                    placeholder="Tìm ứng viên trong việc làm này"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ width: 280 }}
                />
                <Select allowClear placeholder="Điểm AI" style={{ width: 160 }} value={aiTier} onChange={setAiTier} options={AI_TIER_OPTIONS} />
                <Select allowClear placeholder="Người phụ trách" style={{ width: 200 }} value={recruiterId} onChange={setRecruiterId} options={recruiterOptions} />
                <div style={{ marginLeft: "auto" }}>
                    <Segmented
                        value={view}
                        onChange={(v) => setView(v as "board" | "list")}
                        options={[{ value: "board", label: "Theo giai đoạn" }, { value: "list", label: "Danh sách" }]}
                    />
                </div>
            </div>
            {view === "board" ? (
                <ApplicationKanbanBoard
                    applications={filtered}
                    stages={stages}
                    interviews={interviews}
                    offers={offers}
                    canManage={canManage}
                    onChanged={() => void loadAll()}
                />
            ) : (
                <Panel>
                    <Table<ApplicationResponse>
                        rowKey="id"
                        columns={listColumns}
                        dataSource={filtered}
                        pagination={filtered.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                        rowClassName={() => "row-clickable"}
                        onRow={(a) => ({ onClick: () => goToApplication(`/candidates/${a.candidateId}/applications/${a.id}`) })}
                        locale={{ emptyText: "Chưa có ứng viên nào" }}
                    />
                </Panel>
            )}
        </div>
    );

    const contentTab = (
        <Panel>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
                    <span><span style={{ color: COLORS.textSecondary }}>Loại hình: </span>{catalog.emp[posting.employmentTypeId] ?? "—"}</span>
                    <span><span style={{ color: COLORS.textSecondary }}>Mức lương: </span>{formatSalaryShort(posting.salaryMin, posting.salaryMax)}</span>
                    {posting.experienceRequired && <span><span style={{ color: COLORS.textSecondary }}>Kinh nghiệm: </span>{posting.experienceRequired}</span>}
                </div>
                <TextBlock title="Mô tả công việc" value={posting.description} />
                <TextBlock title="Yêu cầu" value={posting.requirements} />
                <TextBlock title="Quyền lợi" value={posting.benefits} />
                {canManage && posting.status !== "CLOSED" && (
                    <div><Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Sửa nội dung tin</Button></div>
                )}
            </div>
        </Panel>
    );

    const steps = [
        { label: "Tạo tin", at: posting.createdAt },
        { label: "Xác nhận nội dung", at: posting.approvedAt, who: posting.approvedByName },
        { label: "Đăng tin", at: posting.publishedAt },
        { label: "Đóng tin", at: posting.closedAt },
    ].filter((s) => s.at);
    const activityTab = (
        <Panel>
            {requisition && (
                <a onClick={() => navigate(`/recruitment/requisitions/${requisition.id}`)} style={{ fontSize: 13 }}>
                    Xem yêu cầu tuyển dụng gốc · {requisition.title}
                </a>
            )}
            {steps.map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `0.5px solid ${COLORS.border}`, fontSize: 13 }}>
                    <span><b style={{ fontWeight: 600 }}>{s.label}</b>{s.who ? <span style={{ color: COLORS.textSecondary }}> · {s.who}</span> : null}</span>
                    <span style={{ color: COLORS.textMuted }}>{fmtStamp(s.at as string)}</span>
                </div>
            ))}
        </Panel>
    );

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                <a onClick={() => navigate("/recruitment/postings")}>Việc làm</a>
                <span style={{ margin: "0 6px", color: COLORS.textMuted }}>›</span>
                <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{posting.title}</span>
            </span>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>{posting.title}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: COLORS.textSecondary }}>
                        <StatusTag {...POSTING_STATUS_VIEW[posting.status]} />
                        <span>{meta}</span>
                    </div>
                </div>
                <Space wrap size={8}>
                    {posting.status === "OPEN" && (
                        <Button icon={<ExportOutlined />} href={`/careers/jobs/${posting.id}`} target="_blank">Xem tin công khai</Button>
                    )}
                    {canManage && <Button icon={<SwapOutlined />} onClick={() => setCompareOpen(true)}>So sánh ứng viên</Button>}
                    {canManage && posting.status === "OPEN" && (
                        <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Thêm ứng viên</Button>
                    )}
                    {statusActions}
                </Space>
            </div>

            <Tabs
                defaultActiveKey="candidates"
                items={[
                    { key: "candidates", label: `Ứng viên ${applications.length}`, children: candidatesTab },
                    { key: "content", label: "Nội dung tin", children: contentTab },
                    { key: "activity", label: "Hoạt động", children: activityTab },
                ]}
            />

            <Modal
                title={`So sánh ứng viên · ${posting.title}`}
                open={compareOpen}
                onCancel={() => setCompareOpen(false)}
                footer={null}
                width="min(2200px, 98vw)"
                style={{ top: 16 }}
                destroyOnHidden
            >
                <CandidateComparisonPanel jobPostingId={posting.id} showHeader={false} />
            </Modal>
            <ApplicationCreateModal
                open={addOpen}
                presetJobPostingId={posting.id}
                onClose={() => setAddOpen(false)}
                onSuccess={() => { setAddOpen(false); void loadAll(); }}
            />
            {canManage && (
                <PostingFormModal
                    open={editOpen}
                    editingItem={posting}
                    onClose={() => setEditOpen(false)}
                    onSuccess={() => { setEditOpen(false); void loadAll(); }}
                />
            )}
        </div>
    );
}
