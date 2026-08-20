import { useCallback, useEffect, useState } from "react";
import { Table, Button, Tag, Segmented, App, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getPostings, changePostingStatus } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
import type { ApiMessageResponse, JobPostingResponse, PostingStatus } from "../types";
import PostingFormModal from "./PostingFormModal";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";

const STATUS_COLOR: Record<PostingStatus, string> = {
    OPEN: "green",
    PAUSED: "gold",
    CLOSED: "default",
};

const STATUS_LABEL: Record<PostingStatus, string> = {
    OPEN: "Đang mở",
    PAUSED: "Tạm dừng",
    CLOSED: "Đã đóng",
};

interface Filters {
    keyword: string;
    status?: PostingStatus;
    employmentTypeId?: number;
    workLocationId?: number;
}

const EMPTY_FILTERS: Filters = { keyword: "" };

export default function PostingListPanel() {
    const { message } = App.useApp();
    const currentUser = useAppSelector((s) => s.auth.user);
    const role = currentUser?.role as UserRole | undefined;
    const canManagePosting = !!role && HR_ROLES.includes(role);

    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [employmentTypes, setEmploymentTypes] = useState<CatalogItem[]>([]);
    const [workLocations, setWorkLocations] = useState<CatalogItem[]>([]);
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [pipelineMap, setPipelineMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JobPostingResponse | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, keyword: searchInput.trim() }));
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const buildMap = (items: CatalogItem[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name as string]));

    const buildPipelineMap = (items: PipelineResponse[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name]));

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [postingRes, empRes, locRes, pipeRes] = await Promise.all([
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
                getPipelines(),
            ]);
            setPostings(postingRes.data.content);
            setTotalItems(postingRes.data.totalItems);
            setEmploymentTypes(empRes.data);
            setWorkLocations(locRes.data);
            setEmploymentTypeMap(buildMap(empRes.data));
            setWorkLocationMap(buildMap(locRes.data));
            setPipelineMap(buildPipelineMap(pipeRes.data));
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

    const handleStatusChange = async (id: number, status: PostingStatus) => {
        try {
            await changePostingStatus(id, { status });
            message.success("Cập nhật trạng thái thành công");
            loadAll();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Cập nhật thất bại");
        }
    };

    const columns = [
        { title: "Tiêu đề", dataIndex: "title", key: "title" },
        {
            title: "Loại hình",
            dataIndex: "employmentTypeId",
            key: "employmentTypeId",
            render: (id: number) => employmentTypeMap[id] ?? "—",
        },
        {
            title: "Địa điểm",
            dataIndex: "workLocationId",
            key: "workLocationId",
            render: (id: number) => workLocationMap[id] ?? "—",
        },
        {
            title: "Quy trình",
            dataIndex: "pipelineId",
            key: "pipelineId",
            render: (id: number) => pipelineMap[id] ?? "—",
        },
        {
            title: "Mức lương",
            key: "salaryRange",
            render: (_: unknown, record: JobPostingResponse) => {
                if (!record.salaryMin && !record.salaryMax) return "Thỏa thuận";
                if (record.salaryMin && record.salaryMax) return `${(record.salaryMin / 1000000).toFixed(0)} - ${(record.salaryMax / 1000000).toFixed(0)} triệu`;
                if (record.salaryMin) return `Từ ${(record.salaryMin / 1000000).toFixed(0)} triệu`;
                return `Đến ${(record.salaryMax! / 1000000).toFixed(0)} triệu`;
            },
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: PostingStatus) => <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>,
        },
        ...(canManagePosting
            ? [
                {
                    title: "Đổi trạng thái",
                    key: "statusAction",
                    render: (_: unknown, record: JobPostingResponse) => (
                        <Segmented
                            size="small"
                            value={record.status}
                            onChange={(value) => handleStatusChange(record.id, value as PostingStatus)}
                            options={[
                                { label: "Mở", value: "OPEN" },
                                { label: "Tạm dừng", value: "PAUSED" },
                                { label: "Đóng", value: "CLOSED" },
                            ]}
                        />
                    ),
                },
                {
                    title: "",
                    key: "edit",
                    render: (_: unknown, record: JobPostingResponse) => (
                        <Button type="link" onClick={() => openEdit(record)}>
                            Sửa
                        </Button>
                    ),
                },
            ]
            : []),
    ];

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                {canManagePosting && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Tạo tin tuyển dụng
                    </Button>
                )}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
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
                    style={{ width: 160 }}
                    value={filters.status}
                    onChange={(v) => { setFilters((f) => ({ ...f, status: v })); setPage(1); }}
                    options={(Object.keys(STATUS_LABEL) as PostingStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
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

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={postings}
                pagination={{
                    current: page,
                    pageSize,
                    total: totalItems,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    showTotal: (total) => `Tổng ${total} tin`,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
            />

            {canManagePosting && (
                <PostingFormModal
                    open={formModalOpen}
                    editingItem={editingItem}
                    onClose={() => setFormModalOpen(false)}
                    onSuccess={loadAll}
                />
            )}
        </div>
    );
}
