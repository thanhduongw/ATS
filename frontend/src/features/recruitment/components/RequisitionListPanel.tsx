import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, App, Input, Select } from "antd";
import {
    PlusOutlined,
    SearchOutlined,
    SolutionOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getRequisitions } from "../recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, JobRequisitionResponse, RequisitionStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import RequisitionFormModal from "./RequisitionFormModal";
import RequisitionDetailModal from "./RequisitionDetailModal";
import { REQUISITION_STATUS_COLOR, REQUISITION_STATUS_LABEL } from "../requisitionStatus";
import StatusTag from "../../../components/ui/StatusTag";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, FilterBar } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";
import { COLORS } from "../../../app/theme";

const STATUS_OPTIONS: RequisitionStatus[] = [
    "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CHANGES_REQUESTED",
];

interface Filters {
    keyword: string;
    status?: RequisitionStatus;
    departmentId?: number;
}

const EMPTY_FILTERS: Filters = { keyword: "" };

export default function RequisitionListPanel() {
    const { message } = App.useApp();
    const currentUser = useAppSelector((state) => state.auth.user);
    const role = currentUser?.role as UserRole | undefined;
    const canCreateRequisition = !!role && DEPARTMENT_ROLES.includes(role);

    const [requisitions, setRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    // Toàn bộ yêu cầu (không phân trang) — chỉ để đếm số liệu, độc lập với bộ lọc của bảng
    const [allRequisitions, setAllRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [departmentMap, setDepartmentMap] = useState<Record<number, string>>({});
    const [jobTitleMap, setJobTitleMap] = useState<Record<number, string>>({});
    const [jobLevelMap, setJobLevelMap] = useState<Record<number, string>>({});
    const [skillMap, setSkillMap] = useState<Record<number, string>>({});
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JobRequisitionResponse | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<JobRequisitionResponse | null>(null);

    // Debounce ô tìm kiếm
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
            const [reqRes, deptRes, titleRes, levelRes, skillRes, empTypeRes, locationRes] = await Promise.all([
                getRequisitions({
                    status: filters.status,
                    departmentId: filters.departmentId,
                    keyword: filters.keyword || undefined,
                    page: page - 1,
                    size: pageSize,
                }),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/job-titles"),
                getCatalogItems("/masterdata/job-levels"),
                getCatalogItems("/masterdata/skills"),
                getCatalogItems("/masterdata/employment-types"),
                getCatalogItems("/masterdata/work-locations"),
            ]);
            setRequisitions(reqRes.data.content);
            setTotalItems(reqRes.data.totalItems);
            setDepartments(deptRes.data);
            setDepartmentMap(buildMap(deptRes.data));
            setJobTitleMap(buildMap(titleRes.data));
            setJobLevelMap(buildMap(levelRes.data));
            setSkillMap(buildMap(skillRes.data));
            setEmploymentTypeMap(buildMap(empTypeRes.data));
            setWorkLocationMap(buildMap(locationRes.data));
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
        getRequisitions({ size: 1000 }).then((r) => setAllRequisitions(r.data.content)).catch(() => setAllRequisitions([]));
    }, []);

    const stats = useMemo(
        () => ({
            total: allRequisitions.length,
            pending: allRequisitions.filter((r) => r.status === "PENDING_APPROVAL").length,
            approved: allRequisitions.filter((r) => r.status === "APPROVED").length,
            changes: allRequisitions.filter((r) => r.status === "CHANGES_REQUESTED").length,
        }),
        [allRequisitions],
    );

    const toggleStatus = (next: RequisitionStatus) => {
        setFilters((f) => ({ ...f, status: f.status === next ? undefined : next }));
        setPage(1);
    };

    const openCreate = () => {
        setEditingItem(null);
        setFormModalOpen(true);
    };

    const openDetail = (item: JobRequisitionResponse) => {
        setSelectedItem(item);
        setDetailOpen(true);
    };

    const openEditFromModal = (item: JobRequisitionResponse) => {
        setDetailOpen(false);
        setEditingItem(item);
        setFormModalOpen(true);
    };

    const columns = [
        { title: "Tiêu đề", dataIndex: "title", key: "title", ellipsis: true },
        {
            title: "Phòng ban",
            dataIndex: "departmentId",
            key: "departmentId",
            width: 200,
            render: (id: number) => departmentMap[id] ?? "—",
        },
        {
            title: "Chức vụ",
            dataIndex: "jobTitleId",
            key: "jobTitleId",
            width: 200,
            render: (id: number) => jobTitleMap[id] ?? "—",
        },
        { title: "Số lượng", dataIndex: "quantity", key: "quantity", width: 100 },
        { title: "Người duyệt", dataIndex: "approverName", key: "approverName", width: 140, ellipsis: true },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 125,
            render: (status: RequisitionStatus) => <StatusTag color={REQUISITION_STATUS_COLOR[status]} label={REQUISITION_STATUS_LABEL[status]} />,
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <StatRow>
                <StatTile
                    icon={<SolutionOutlined />}
                    label="Tổng yêu cầu"
                    value={stats.total}
                    accent={COLORS.primary}
                    active={!filters.status}
                    onClick={() => { setFilters((f) => ({ ...f, status: undefined })); setPage(1); }}
                />
                <StatTile
                    icon={<ClockCircleOutlined />}
                    label="Chờ duyệt"
                    value={stats.pending}
                    accent="#F59E0B"
                    active={filters.status === "PENDING_APPROVAL"}
                    onClick={() => toggleStatus("PENDING_APPROVAL")}
                />
                <StatTile
                    icon={<CheckCircleOutlined />}
                    label="Đã duyệt"
                    value={stats.approved}
                    accent={COLORS.success}
                    active={filters.status === "APPROVED"}
                    onClick={() => toggleStatus("APPROVED")}
                />
                <StatTile
                    icon={<ExclamationCircleOutlined />}
                    label="Cần chỉnh sửa"
                    value={stats.changes}
                    accent="#8B5CF6"
                    active={filters.status === "CHANGES_REQUESTED"}
                    onClick={() => toggleStatus("CHANGES_REQUESTED")}
                />
            </StatRow>

            <FilterBar extra={canCreateRequisition && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Tạo yêu cầu tuyển dụng
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
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: REQUISITION_STATUS_LABEL[s] }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Phòng ban"
                    style={{ width: 180 }}
                    value={filters.departmentId}
                    onChange={(v) => { setFilters((f) => ({ ...f, departmentId: v })); setPage(1); }}
                    options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                />
            </FilterBar>

            <div className="page-shell-scroll">
                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={requisitions}
                    onRow={(record) => ({
                        onClick: () => openDetail(record),
                        style: { cursor: "pointer" },
                    })}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalItems,
                        ...listPagination("yêu cầu"),
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    locale={{
                        emptyText: loading ? <span /> : (
                            <EmptyState
                                title="Chưa có yêu cầu tuyển dụng nào"
                                description="Tạo yêu cầu đầu tiên để gửi HR duyệt và mở tin tuyển dụng."
                            />
                        ),
                    }}
                />
            </div>

            <RequisitionFormModal
                open={formModalOpen}
                editingItem={editingItem}
                onClose={() => setFormModalOpen(false)}
                onSuccess={loadAll}
            />

            <RequisitionDetailModal
                open={detailOpen}
                requisition={selectedItem}
                departmentMap={departmentMap}
                jobTitleMap={jobTitleMap}
                jobLevelMap={jobLevelMap}
                skillMap={skillMap}
                employmentTypeMap={employmentTypeMap}
                workLocationMap={workLocationMap}
                onClose={() => setDetailOpen(false)}
                onChanged={loadAll}
                onEdit={openEditFromModal}
            />
        </div>
    );
}
