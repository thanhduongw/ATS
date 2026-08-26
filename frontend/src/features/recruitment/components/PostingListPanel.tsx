import { useCallback, useEffect, useState } from "react";
import { Table, Button, Tag, App, Input, Select, Space, Tooltip } from "antd";
import { PlusOutlined, SearchOutlined, FileSearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import {
    getPostings, changePostingStatus, submitPostingForReview, requestPostingEdit, publishPosting,
} from "../recruitmentApi";
import { getRequisitionById } from "../recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getApplications } from "../../candidate/applicationApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, JobPostingResponse, JobRequisitionResponse, PostingStatus } from "../types";
import PostingFormModal from "./PostingFormModal";
import RequisitionDetailModal from "./RequisitionDetailModal";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { POSTING_STATUS, statusMeta } from "../../../app/statusLabels";
import { useTableScrollY } from "../../../app/useTableScrollY";

interface Filters {
    keyword: string;
    status?: PostingStatus;
    employmentTypeId?: number;
    workLocationId?: number;
}

const EMPTY_FILTERS: Filters = { keyword: "" };

export default function PostingListPanel() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const currentUser = useAppSelector((s) => s.auth.user);
    const role = currentUser?.role as UserRole | undefined;
    const canManagePosting = !!role && HR_ROLES.includes(role);

    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [applicationCountMap, setApplicationCountMap] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(false);
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
            const [postingRes, empRes, locRes, deptRes, titleRes, levelRes, skillRes, allAppsRes] = await Promise.all([
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

    const openCreate = () => {
        setEditingItem(null);
        setFormModalOpen(true);
    };

    const openEdit = (item: JobPostingResponse) => {
        setEditingItem(item);
        setFormModalOpen(true);
    };

    const openRequisitionModal = async (requisitionId: number) => {
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
                    <Button size="small" type="primary" loading={busy} onClick={() => handleSubmitReview(record.id)}>
                        Gửi duyệt
                    </Button>
                );
            case "APPROVED":
                return (
                    <>
                        <Button size="small" loading={busy} onClick={() => handleRequestEdit(record.id)}>
                            Sửa lại
                        </Button>
                        <Button size="small" type="primary" loading={busy} onClick={() => handlePublish(record.id)}>
                            Đăng tin
                        </Button>
                    </>
                );
            case "OPEN":
                return (
                    <>
                        <Button size="small" loading={busy} onClick={() => handleStatusChange(record.id, "PAUSED")}>
                            Tạm dừng
                        </Button>
                        <Button size="small" danger loading={busy} onClick={() => handleStatusChange(record.id, "CLOSED")}>
                            Đóng
                        </Button>
                    </>
                );
            case "PAUSED":
                return (
                    <>
                        <Button size="small" type="primary" loading={busy} onClick={() => handleStatusChange(record.id, "OPEN")}>
                            Mở lại
                        </Button>
                        <Button size="small" danger loading={busy} onClick={() => handleStatusChange(record.id, "CLOSED")}>
                            Đóng
                        </Button>
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
            render: (title: string, record: JobPostingResponse) => (
                <a onClick={() => navigate(`/recruitment/postings/${record.id}`)}>{title}</a>
            ),
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
            render: (_: unknown, record: JobPostingResponse) => {
                if (!record.salaryMin && !record.salaryMax) return "Thỏa thuận";
                if (record.salaryMin && record.salaryMax) return `${(record.salaryMin / 1000000).toFixed(0)} - ${(record.salaryMax / 1000000).toFixed(0)} tr`;
                if (record.salaryMin) return `Từ ${(record.salaryMin / 1000000).toFixed(0)} tr`;
                return `Đến ${(record.salaryMax! / 1000000).toFixed(0)} tr`;
            },
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
            width: canManagePosting ? 260 : 60,
            render: (_: unknown, record: JobPostingResponse) => (
                <Space size={4} wrap>
                    <Tooltip title="Xem yêu cầu đăng tin">
                        <Button
                            size="small"
                            type="text"
                            icon={<FileSearchOutlined />}
                            onClick={() => openRequisitionModal(record.requisitionId)}
                        />
                    </Tooltip>
                    {canManagePosting && renderStatusActions(record)}
                    {canManagePosting && (
                        <Button size="small" type="link" onClick={() => openEdit(record)}>
                            Sửa
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, flexShrink: 0 }}>
                {canManagePosting && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Tạo tin tuyển dụng
                    </Button>
                )}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
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
                    style={{ width: 170 }}
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
                    style={{ width: 170 }}
                    value={filters.employmentTypeId}
                    onChange={(v) => { setFilters((f) => ({ ...f, employmentTypeId: v })); setPage(1); }}
                    options={employmentTypes.map((e) => ({ value: e.id, label: String(e.name) }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Địa điểm"
                    style={{ width: 170 }}
                    value={filters.workLocationId}
                    onChange={(v) => { setFilters((f) => ({ ...f, workLocationId: v })); setPage(1); }}
                    options={workLocations.map((w) => ({ value: w.id, label: String(w.name) }))}
                />
            </div>

            <div ref={wrapRef} className="table-scroll-wrap">
                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={postings}
                    sticky
                    scroll={{ y: scrollY }}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalItems,
                        size: "small",
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        showTotal: (total) => `Tổng ${total} tin`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
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
        </div>
    );
}
