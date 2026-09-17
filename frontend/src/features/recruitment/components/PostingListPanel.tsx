import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Tag, App, Input, Select, Space } from "antd";
import {
    PlusOutlined,
    SearchOutlined,
    FileSearchOutlined,
    EyeOutlined,
    EditOutlined,
    SendOutlined,
    RollbackOutlined,
    RocketOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    StopOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import {
    getPostings, changePostingStatus, submitPostingForReview, requestPostingEdit, publishPosting,
} from "../recruitmentApi";
import { getRequisitionById } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import { getApplications } from "../../candidate/applicationApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse, PostingStatus } from "../types";
import PostingFormModal from "./PostingFormModal";
import PostingDetailModal from "./PostingDetailModal";
import RequisitionDetailModal from "./RequisitionDetailModal";
import { useAppSelector } from "../../../app/hooks";
import { useTrailNavigate } from "../../../app/useNavTrail";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { POSTING_STATUS, statusMeta } from "../../../app/statusLabels";
import { useTableScrollY } from "../../../app/useTableScrollY";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, FilterBar, IconAction } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";
import { COLORS } from "../../../app/theme";
import { formatSalaryShort } from "../../../app/money";

interface Filters {
    keyword: string;
    status?: PostingStatus;
    employmentTypeId?: number;
    workLocationId?: number;
}

const EMPTY_FILTERS: Filters = { keyword: "" };

export default function PostingListPanel() {
    const { message } = App.useApp();
    const openPosting = useTrailNavigate();
    const currentUser = useAppSelector((s) => s.auth.user);
    const role = currentUser?.role as UserRole | undefined;
    const canManagePosting = !!role && HR_ROLES.includes(role);

    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    // Toàn bộ tin (không phân trang) — chỉ để đếm số liệu, độc lập với bộ lọc của bảng
    const [allPostings, setAllPostings] = useState<JobPostingResponse[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [pipelineMap, setPipelineMap] = useState<Record<number, string>>({});
    const [applicationCountMap, setApplicationCountMap] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Maps phục vụ RequisitionDetailModal ("Xem yêu cầu đăng tin")
    const [departmentMap, setDepartmentMap] = useState<Record<number, string>>({});
    const [jobTitleMap, setJobTitleMap] = useState<Record<number, string>>({});
    const [jobLevelMap, setJobLevelMap] = useState<Record<number, string>>({});
    const [skillMap, setSkillMap] = useState<Record<number, string>>({});

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JobPostingResponse | null>(null);

    const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<JobRequisitionResponse | null>(null);
    const [requisitionLoading, setRequisitionLoading] = useState(false);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedPosting, setSelectedPosting] = useState<JobPostingResponse | null>(null);

    const { wrapRef, scrollY } = useTableScrollY([loading, postings.length]);

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, keyword: searchInput.trim() }));
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const buildMap = (items: CatalogItem[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name as string]));

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [postingRes, empRes, locRes, deptRes, titleRes, levelRes, skillRes, pipelineRes, allAppsRes] = await Promise.all([
                getPostings({
                    status: filters.status,
                    employmentTypeId: filters.employmentTypeId,
                    workLocationId: filters.workLocationId,
                    keyword: filters.keyword || undefined,
                    page: page - 1,
                    size: pageSize,
                }),
                getCatalogItems("/masterdata/employment-types"),
                getCatalogItems("/masterdata/work-locations"),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/job-titles"),
                getCatalogItems("/masterdata/job-levels"),
                getCatalogItems("/masterdata/skills"),
                getPipelines(),
                getApplications(),
            ]);
            setPostings(postingRes.data.content);
            setTotalItems(postingRes.data.totalItems);
            setEmploymentTypes(empRes.data);
            setWorkLocations(locRes.data);
            setEmploymentTypeMap(buildMap(empRes.data));
            setWorkLocationMap(buildMap(locRes.data));
            setDepartmentMap(buildMap(deptRes.data));
            setJobTitleMap(buildMap(titleRes.data));
            setJobLevelMap(buildMap(levelRes.data));
            setSkillMap(buildMap(skillRes.data));
            setPipelineMap(Object.fromEntries(pipelineRes.data.map((p) => [p.id, p.name])));

            const counts: Record<number, number> = {};
            for (const app of allAppsRes.data.content) {
                counts[app.jobPostingId] = (counts[app.jobPostingId] ?? 0) + 1;
            }
            setApplicationCountMap(counts);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, [message, filters, page, pageSize]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        getPostings({ size: 1000 }).then((r) => setAllPostings(r.data.content)).catch(() => setAllPostings([]));
    }, []);

    const stats = useMemo(
        () => ({
            total: allPostings.length,
            open: allPostings.filter((p) => p.status === "OPEN").length,
            approved: allPostings.filter((p) => p.status === "APPROVED").length,
            applications: Object.values(applicationCountMap).reduce((sum, n) => sum + n, 0),
        }),
        [allPostings, applicationCountMap],
    );

    const toggleStatus = (next: PostingStatus) => {
        setFilters((f) => ({ ...f, status: f.status === next ? undefined : next }));
        setPage(1);
    };

    const openCreate = () => {
        setEditingItem(null);
        setFormModalOpen(true);
    };

    const openEdit = (item: JobPostingResponse) => {
        setDetailOpen(false);
        setEditingItem(item);
        setFormModalOpen(true);
    };

    const openDetail = (item: JobPostingResponse) => {
        setSelectedPosting(item);
        setDetailOpen(true);
    };

    const openRequisitionModal = async (requisitionId: number) => {
        setDetailOpen(false);
        setRequisitionModalOpen(true);
        setRequisitionLoading(true);
        try {
            const res = await getRequisitionById(requisitionId);
            setSelectedRequisition(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được yêu cầu tuyển dụng");
            setRequisitionModalOpen(false);
        } finally {
            setRequisitionLoading(false);
        }
    };

    const runAction = async (id: number, action: () => Promise<unknown>, successMsg: string) => {
        setActionLoadingId(id);
        try {
            await action();
            message.success(successMsg);
            loadAll();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Thao tác thất bại");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleStatusChange = (id: number, status: PostingStatus) =>
        runAction(id, () => changePostingStatus(id, { status }), "Cập nhật trạng thái thành công");

    const handleSubmitReview = (id: number) =>
        runAction(id, () => submitPostingForReview(id), "Đã gửi duyệt tin tuyển dụng");

    const handleRequestEdit = (id: number) =>
        runAction(id, () => requestPostingEdit(id), "Đã chuyển tin về trạng thái chỉnh sửa");

    const handlePublish = (id: number) =>
        runAction(id, () => publishPosting(id), "Đã đăng tin tuyển dụng");

    const renderStatusActions = (record: JobPostingResponse) => {
        const busy = actionLoadingId === record.id;
        switch (record.status) {
            case "DRAFT":
            case "EDITING":
                return (
                    <IconAction
                        title="Gửi duyệt"
                        icon={<SendOutlined />}
                        accent={COLORS.primary}
                        loading={busy}
                        onClick={() => handleSubmitReview(record.id)}
                    />
                );
            case "APPROVED":
                return (
                    <>
                        <IconAction
                            title="Sửa lại (chuyển về chỉnh sửa)"
                            icon={<RollbackOutlined />}
                            loading={busy}
                            onClick={() => handleRequestEdit(record.id)}
                        />
                        <IconAction
                            title="Đăng tin"
                            icon={<RocketOutlined />}
                            accent={COLORS.primary}
                            loading={busy}
                            onClick={() => handlePublish(record.id)}
                            confirm={{
                                title: "Đăng tin tuyển dụng này?",
                                description: "Tin sẽ hiển thị công khai cho ứng viên.",
                                okText: "Đăng tin",
                            }}
                        />
                    </>
                );
            case "OPEN":
                return (
                    <>
                        <IconAction
                            title="Tạm dừng"
                            icon={<PauseCircleOutlined />}
                            loading={busy}
                            onClick={() => handleStatusChange(record.id, "PAUSED")}
                        />
                        <IconAction
                            title="Đóng tin"
                            icon={<StopOutlined />}
                            danger
                            loading={busy}
                            onClick={() => handleStatusChange(record.id, "CLOSED")}
                            confirm={{
                                title: "Đóng tin tuyển dụng này?",
                                description: "Ứng viên sẽ không nộp hồ sơ được nữa.",
                                okText: "Đóng tin",
                            }}
                        />
                    </>
                );
            case "PAUSED":
                return (
                    <>
                        <IconAction
                            title="Mở lại"
                            icon={<PlayCircleOutlined />}
                            accent={COLORS.primary}
                            loading={busy}
                            onClick={() => handleStatusChange(record.id, "OPEN")}
                        />
                        <IconAction
                            title="Đóng tin"
                            icon={<StopOutlined />}
                            danger
                            loading={busy}
                            onClick={() => handleStatusChange(record.id, "CLOSED")}
                            confirm={{
                                title: "Đóng tin tuyển dụng này?",
                                description: "Ứng viên sẽ không nộp hồ sơ được nữa.",
                                okText: "Đóng tin",
                            }}
                        />
                    </>
                );
            default:
                return null;
        }
    };

    const columns = [
        {
            title: "Tiêu đề",
            dataIndex: "title",
            key: "title",
            ellipsis: true,
            render: (title: string) => <span style={{ color: COLORS.primary, fontWeight: 500 }}>{title}</span>,
        },
        {
            title: "Loại hình / Địa điểm",
            key: "typeLocation",
            width: 180,
            render: (_: unknown, record: JobPostingResponse) => (
                <div style={{ lineHeight: 1.4 }}>
                    <div style={{ fontSize: 12 }}>{employmentTypeMap[record.employmentTypeId] ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{workLocationMap[record.workLocationId] ?? "—"}</div>
                </div>
            ),
        },
        {
            title: "Mức lương",
            key: "salaryRange",
            width: 130,
            render: (_: unknown, record: JobPostingResponse) =>
                formatSalaryShort(record.salaryMin, record.salaryMax),
        },
        {
            title: "SL ứng viên",
            key: "applicationCount",
            width: 90,
            align: "center" as const,
            render: (_: unknown, record: JobPostingResponse) => applicationCountMap[record.id] ?? 0,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (status: PostingStatus) => {
                const meta = statusMeta(POSTING_STATUS, status);
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
        },
        {
            title: "Thao tác",
            key: "actions",
            width: canManagePosting ? 200 : 80,
            render: (_: unknown, record: JobPostingResponse) => (
                <Space size={4} wrap onClick={(e) => e.stopPropagation()}>
                    <IconAction
                        title="Xem chi tiết tin tuyển dụng"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    />
                    <IconAction
                        title="Xem yêu cầu đăng tin"
                        icon={<FileSearchOutlined />}
                        onClick={() => openRequisitionModal(record.requisitionId)}
                    />
                    {canManagePosting && renderStatusActions(record)}
                    {canManagePosting && (
                        <IconAction
                            title="Sửa tin tuyển dụng"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        />
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <StatRow>
                <StatTile
                    icon={<FileSearchOutlined />}
                    label="Tổng tin tuyển dụng"
                    value={stats.total}
                    accent={COLORS.primary}
                    active={!filters.status}
                    onClick={() => { setFilters((f) => ({ ...f, status: undefined })); setPage(1); }}
                />
                <StatTile
                    icon={<RocketOutlined />}
                    label="Đang mở"
                    value={stats.open}
                    accent={COLORS.success}
                    active={filters.status === "OPEN"}
                    onClick={() => toggleStatus("OPEN")}
                />
                <StatTile
                    icon={<SendOutlined />}
                    label="Chờ đăng"
                    hint="đã duyệt"
                    value={stats.approved}
                    accent="#3B82F6"
                    active={filters.status === "APPROVED"}
                    onClick={() => toggleStatus("APPROVED")}
                />
                <StatTile
                    icon={<TeamOutlined />}
                    label="Tổng ứng viên"
                    value={stats.applications}
                    accent="#8B5CF6"
                />
            </StatRow>

            <FilterBar extra={canManagePosting && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Tạo tin tuyển dụng
                    </Button>
                )}>
                <Input
                    prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                    placeholder="Tìm theo tiêu đề..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                />
                <Select
                    allowClear
                    placeholder="Trạng thái"
                    style={{ width: 180 }}
                    value={filters.status}
                    onChange={(v) => { setFilters((f) => ({ ...f, status: v })); setPage(1); }}
                    options={(Object.keys(POSTING_STATUS) as PostingStatus[]).map((s) => ({
                        value: s, label: POSTING_STATUS[s].label,
                    }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Loại hình"
                    style={{ width: 180 }}
                    value={filters.employmentTypeId}
                    onChange={(v) => { setFilters((f) => ({ ...f, employmentTypeId: v })); setPage(1); }}
                    options={employmentTypes.map((e) => ({ value: e.id, label: String(e.name) }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Địa điểm"
                    style={{ width: 180 }}
                    value={filters.workLocationId}
                    onChange={(v) => { setFilters((f) => ({ ...f, workLocationId: v })); setPage(1); }}
                    options={workLocations.map((w) => ({ value: w.id, label: String(w.name) }))}
                />
            </FilterBar>

            <div ref={wrapRef} className="table-scroll-wrap">
                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={postings}
                    sticky
                    scroll={{ y: scrollY }}
                    onRow={(record) => ({
                        onClick: () => openPosting(`/recruitment/postings/${record.id}`),
                        style: { cursor: "pointer" },
                    })}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalItems,
                        ...listPagination("tin"),
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    locale={{
                        emptyText: loading ? <span /> : (
                            <EmptyState
                                title="Chưa có tin tuyển dụng nào"
                                description="Tạo tin đầu tiên từ một yêu cầu tuyển dụng đã được HR phê duyệt."
                            />
                        ),
                    }}
                />
            </div>

            {canManagePosting && (
                <PostingFormModal
                    open={formModalOpen}
                    editingItem={editingItem}
                    onClose={() => setFormModalOpen(false)}
                    onSuccess={loadAll}
                />
            )}

            <RequisitionDetailModal
                open={requisitionModalOpen}
                requisition={requisitionLoading ? null : selectedRequisition}
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

            <PostingDetailModal
                open={detailOpen}
                posting={selectedPosting}
                employmentTypeMap={employmentTypeMap}
                workLocationMap={workLocationMap}
                pipelineMap={pipelineMap}
                skillMap={skillMap}
                canManage={canManagePosting}
                onClose={() => setDetailOpen(false)}
                onViewRequisition={openRequisitionModal}
                onEdit={openEdit}
            />
        </div>
    );
}
