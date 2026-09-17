import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Card, Segmented, Space, Steps, Table, Tag, Spin, Empty } from "antd";
import {
    ArrowLeftOutlined, FileSearchOutlined, TeamOutlined, CalendarOutlined,
    DollarOutlined, TrophyOutlined, PlusCircleOutlined, SendOutlined, BarChartOutlined,
    EditOutlined, RocketOutlined, StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
    getPostingById, getRequisitionById, changePostingStatus,
    submitPostingForReview, requestPostingEdit, publishPosting,
} from "../recruitmentApi";
import { getPostingStats } from "../../dashboard/dashboardApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getApplications } from "../../candidate/applicationApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse, PostingStatsResponse } from "../types";
import type { ApplicationResponse } from "../../candidate/types";
import RequisitionDetailModal from "../components/RequisitionDetailModal";
import ApplicationKanbanBoard from "../../candidate/components/ApplicationKanbanBoard";
import CandidateComparisonPanel from "../../offer/components/CandidateComparisonPanel";
import StatTile from "../../../components/ui/StatTile";
import { StatRow } from "../../../components/ui/pageKit";
import { POSTING_STATUS, INTERVIEW_STATUS, statusMeta } from "../../../app/statusLabels";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { COLORS } from "../../../app/theme";
import { useTableScrollY } from "../../../app/useTableScrollY";
import { useBreadcrumbLabel } from "../../../app/useBreadcrumbLabel";

const RESULT_META: Record<string, { label: string; color: string }> = {
    HIRED: { label: "Đã tuyển", color: "success" },
    REJECTED: { label: "Từ chối", color: "error" },
    OFFER: { label: "Đang chờ offer", color: "gold" },
};

function fmtStepTime(v: string) {
    return new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PostingHubPage() {
    const { id } = useParams();
    const jobPostingId = Number(id);
    const navigate = useNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const canManage = !!role && HR_ROLES.includes(role);

    const [posting, setPosting] = useState<JobPostingResponse | null>(null);
    const [stats, setStats] = useState<PostingStatsResponse | null>(null);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "kanban" | "compare">("list");

    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [departmentMap, setDepartmentMap] = useState<Record<number, string>>({});
    const [jobTitleMap, setJobTitleMap] = useState<Record<number, string>>({});
    const [jobLevelMap, setJobLevelMap] = useState<Record<number, string>>({});
    const [skillMap, setSkillMap] = useState<Record<number, string>>({});

    const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<JobRequisitionResponse | null>(null);

    const { wrapRef, scrollY } = useTableScrollY([loading, applications.length, viewMode]);

    const buildMap = (items: CatalogItem[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name as string]));

    const loadAll = useCallback(async () => {
        if (!jobPostingId) return;
        setLoading(true);
        try {
            const [postingRes, appsRes, empRes, locRes, deptRes, titleRes, levelRes, skillRes] = await Promise.all([
                getPostingById(jobPostingId),
                getApplications({ jobPostingId }),
                getCatalogItems("/masterdata/employment-types"),
                getCatalogItems("/masterdata/work-locations"),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/job-titles"),
                getCatalogItems("/masterdata/job-levels"),
                getCatalogItems("/masterdata/skills"),
            ]);
            setPosting(postingRes.data);
            setApplications(appsRes.data.content);
            setEmploymentTypeMap(buildMap(empRes.data));
            setWorkLocationMap(buildMap(locRes.data));
            setDepartmentMap(buildMap(deptRes.data));
            setJobTitleMap(buildMap(titleRes.data));
            setJobLevelMap(buildMap(levelRes.data));
            setSkillMap(buildMap(skillRes.data));

            // Thống kê không quan trọng bằng dữ liệu chính — lỗi ở đây không chặn cả trang.
            getPostingStats(jobPostingId).then((r) => setStats(r.data)).catch(() => setStats(null));
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu tin tuyển dụng");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, message]);

    useEffect(() => { loadAll(); }, [loadAll]);
    useBreadcrumbLabel(posting?.title);

    const openRequisitionModal = async () => {
        if (!posting) return;
        setRequisitionModalOpen(true);
        try {
            const res = await getRequisitionById(posting.requisitionId);
            setSelectedRequisition(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được yêu cầu tuyển dụng");
            setRequisitionModalOpen(false);
        }
    };

    const runAction = async (action: () => Promise<unknown>, successMsg: string) => {
        setActionLoading(true);
        try {
            await action();
            message.success(successMsg);
            loadAll();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !posting) {
        return (
            <div className="page-shell" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!posting) {
        return (
            <div className="page-shell">
                <Empty description="Không tìm thấy tin tuyển dụng" />
            </div>
        );
    }

    const statusMetaValue = statusMeta(POSTING_STATUS, posting.status);

    const renderActions = () => {
        if (!canManage) return null;
        switch (posting.status) {
            case "DRAFT":
            case "EDITING":
                return (
                    <Button type="primary" icon={<SendOutlined />} loading={actionLoading}
                        onClick={() => runAction(() => submitPostingForReview(posting.id), "Đã gửi duyệt tin tuyển dụng")}>
                        Gửi duyệt
                    </Button>
                );
            case "APPROVED":
                return (
                    <Space>
                        <Button icon={<EditOutlined />} loading={actionLoading}
                            onClick={() => runAction(() => requestPostingEdit(posting.id), "Đã chuyển tin về trạng thái chỉnh sửa")}>
                            Sửa lại
                        </Button>
                        <Button type="primary" icon={<RocketOutlined />} loading={actionLoading}
                            onClick={() => runAction(() => publishPosting(posting.id), "Đã đăng tin tuyển dụng")}>
                            Đăng tin
                        </Button>
                    </Space>
                );
            case "OPEN":
                return (
                    <Space>
                        <Button loading={actionLoading}
                            onClick={() => runAction(() => changePostingStatus(posting.id, { status: "PAUSED" }), "Đã tạm dừng tin")}>
                            Tạm dừng
                        </Button>
                        <Button danger icon={<StopOutlined />} loading={actionLoading}
                            onClick={() => runAction(() => changePostingStatus(posting.id, { status: "CLOSED" }), "Đã đóng tin")}>
                            Đóng
                        </Button>
                    </Space>
                );
            case "PAUSED":
                return (
                    <Space>
                        <Button type="primary" loading={actionLoading}
                            onClick={() => runAction(() => changePostingStatus(posting.id, { status: "OPEN" }), "Đã mở lại tin")}>
                            Mở lại
                        </Button>
                        <Button danger icon={<StopOutlined />} loading={actionLoading}
                            onClick={() => runAction(() => changePostingStatus(posting.id, { status: "CLOSED" }), "Đã đóng tin")}>
                            Đóng
                        </Button>
                    </Space>
                );
            default:
                return null;
        }
    };

    // Vòng đời trạng thái — Steps ngang, gọn 1 hàng thay vì Timeline dọc chiếm nhiều chỗ.
    const lifecycleSteps = [
        { title: "Tạo tin", timestamp: posting.createdAt, extra: null as string | null },
        { title: "Gửi duyệt", timestamp: posting.submittedAt, extra: null as string | null },
        { title: "Đã duyệt", timestamp: posting.approvedAt, extra: posting.approvedByName },
        { title: "Đã đăng", timestamp: posting.publishedAt, extra: null as string | null },
    ];
    if (posting.status === "CLOSED" && posting.closedAt) {
        lifecycleSteps.push({ title: "Đã đóng", timestamp: posting.closedAt, extra: null });
    }
    const currentStepIndex = lifecycleSteps.reduce((acc, s, idx) => (s.timestamp ? idx : acc), 0);

    const columns: ColumnsType<ApplicationResponse> = [
        { title: "Ứng viên", dataIndex: "candidateName", key: "candidateName", ellipsis: true },
        {
            title: "Giai đoạn hiện tại",
            key: "stage",
            width: 200,
            render: (_, r) => <Tag color="blue">{r.currentStageName}</Tag>,
        },
        {
            title: "Trạng thái gần nhất",
            key: "interviewStatus",
            width: 200,
            render: (_, r) => {
                const status = stats?.latestInterviewStatusByApplicationId?.[r.id];
                if (!status) return <span style={{ color: COLORS.textMuted }}>Chưa có lịch</span>;
                const meta = statusMeta(INTERVIEW_STATUS, status);
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
        },
        {
            title: "Kết quả",
            key: "result",
            width: 140,
            render: (_, r) => {
                const meta = RESULT_META[r.currentStageType];
                return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <span style={{ color: COLORS.textMuted }}>Đang xử lý</span>;
            },
        },
        {
            title: "Ngày ứng tuyển",
            dataIndex: "appliedAt",
            key: "appliedAt",
            width: 160,
            render: (v: string) => new Date(v).toLocaleDateString("vi-VN"),
        },
    ];

    return (
        <div className="page-shell animate-fade-in">
            <div className="page-header page-shell-fixed" style={{ marginBottom: 14 }}>
                <Space align="center" wrap>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/recruitment")}>Quay lại</Button>
                    <Tag color={statusMetaValue.color}>{statusMetaValue.label}</Tag>
                    <span className="page-header-subtitle" style={{ margin: 0 }}>
                        {employmentTypeMap[posting.employmentTypeId] ?? "—"} · {workLocationMap[posting.workLocationId] ?? "—"}
                    </span>
                </Space>
                <Space wrap>
                    <Button icon={<FileSearchOutlined />} onClick={openRequisitionModal}>Xem yêu cầu gốc</Button>
                    {renderActions()}
                </Space>
            </div>

            <StatRow>
                <StatTile icon={<TeamOutlined />} label="Tổng ứng viên" value={stats?.totalApplications ?? applications.length} accent="#3B82F6" />
                <StatTile icon={<CalendarOutlined />} label="Đang phỏng vấn" value={stats?.interviewingCount ?? 0} accent="#F59E0B" />
                <StatTile icon={<DollarOutlined />} label="Đã offer" value={stats?.offerCount ?? 0} accent="#8B5CF6" />
                <StatTile icon={<TrophyOutlined />} label="Đã tuyển" value={stats?.hiredCount ?? 0} accent={COLORS.success} />
            </StatRow>

            <Card size="small" className="page-shell-fixed" style={{ marginBottom: 14, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12 }}>
                <Steps
                    size="small"
                    current={currentStepIndex}
                    items={lifecycleSteps.map((s) => ({
                        title: s.title,
                        description: s.timestamp ? (
                            <span style={{ fontSize: 11 }}>
                                {fmtStepTime(s.timestamp)}{s.extra ? ` · ${s.extra}` : ""}
                            </span>
                        ) : undefined,
                    }))}
                />
            </Card>

            <Card
                className="table-card-fill"
                style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, flex: 1, minHeight: 0 }}
                styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                        <PlusCircleOutlined style={{ marginRight: 8, color: COLORS.textMuted }} />
                        Ứng viên ({applications.length})
                    </span>
                    <Segmented
                        value={viewMode}
                        onChange={(v) => setViewMode(v as "list" | "kanban" | "compare")}
                        options={[
                            { label: "Danh sách", value: "list" },
                            { label: "Kanban", value: "kanban" },
                            // So sanh la buoc ra quyet dinh offer nen chi HR va admin dung toi.
                            ...(canManage ? [{ label: "So sánh", value: "compare", icon: <BarChartOutlined /> }] : []),
                        ]}
                    />
                </div>

                {viewMode === "compare" ? (
                    <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                        <CandidateComparisonPanel jobPostingId={jobPostingId} showHeader={false} />
                    </div>
                ) : viewMode === "list" ? (
                    <div ref={wrapRef} className="table-scroll-wrap">
                        <Table
                            rowKey="id"
                            size="small"
                            sticky
                            scroll={{ y: scrollY }}
                            columns={columns}
                            dataSource={applications}
                            onRow={(record) => ({
                                onClick: () => navigate(`/candidates/${record.candidateId}/applications/${record.id}`),
                                style: { cursor: "pointer" },
                            })}
                            pagination={{ pageSize: 10, size: "small", showTotal: (t) => `Tổng ${t} ứng viên` }}
                            locale={{
                                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có ứng viên nào ứng tuyển vào tin này" />,
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        <ApplicationKanbanBoard jobPostingId={jobPostingId} />
                    </div>
                )}
            </Card>

            <RequisitionDetailModal
                open={requisitionModalOpen}
                requisition={selectedRequisition}
                departmentMap={departmentMap}
                jobTitleMap={jobTitleMap}
                jobLevelMap={jobLevelMap}
                skillMap={skillMap}
                employmentTypeMap={employmentTypeMap}
                workLocationMap={workLocationMap}
                onClose={() => setRequisitionModalOpen(false)}
                onChanged={loadAll}
                onEdit={() => setRequisitionModalOpen(false)}
            />
        </div>
    );
}
