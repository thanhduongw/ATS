import { useCallback, useEffect, useState } from "react";
import { Table, Button, App, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
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
    const [departmentMap, setDepartmentMap] = useState<Record<number, string>>({});
    const [jobTitleMap, setJobTitleMap] = useState<Record<number, string>>({});
    const [jobLevelMap, setJobLevelMap] = useState<Record<number, string>>({});
    const [skillMap, setSkillMap] = useState<Record<number, string>>({});
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);

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
            width: 160,
            render: (id: number) => departmentMap[id] ?? "—",
        },
        {
            title: "Chức vụ",
            dataIndex: "jobTitleId",
            key: "jobTitleId",
            width: 160,
            render: (id: number) => jobTitleMap[id] ?? "—",
        },
        { title: "SL", dataIndex: "quantity", key: "quantity", width: 45 },
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, flexShrink: 0 }}>
                {canCreateRequisition && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Tạo yêu cầu tuyển dụng
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
            </div>

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
                        size: "small",
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        showTotal: (total) => `Tổng ${total} yêu cầu`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    locale={{
                        emptyText: (
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
