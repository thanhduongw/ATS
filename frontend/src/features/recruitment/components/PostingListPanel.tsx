import { useCallback, useEffect, useState } from "react";
import { Table, Button, Tag, Segmented, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getPostings, changePostingStatus } from "../recruitmentApi";
import { getCatalogItems, getPipelines } from "../../masterdata/masterdataApi";
import type { CatalogItem, PipelineResponse } from "../../masterdata/types";
import type { ApiMessageResponse, JobPostingResponse, PostingStatus } from "../types";
import PostingFormModal from "./PostingFormModal";

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

export default function PostingListPanel() {
    const { message } = App.useApp();
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [employmentTypeMap, setEmploymentTypeMap] = useState<Record<number, string>>({});
    const [workLocationMap, setWorkLocationMap] = useState<Record<number, string>>({});
    const [pipelineMap, setPipelineMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JobPostingResponse | null>(null);

    const buildMap = (items: CatalogItem[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name as string]));

    const buildPipelineMap = (items: PipelineResponse[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name]));

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [postingRes, empRes, locRes, pipeRes] = await Promise.all([
                getPostings(),
                getCatalogItems("/masterdata/employment-types"),
                getCatalogItems("/masterdata/work-locations"),
                getPipelines(),
            ]);
            setPostings(postingRes.data);
            setEmploymentTypeMap(buildMap(empRes.data));
            setWorkLocationMap(buildMap(locRes.data));
            setPipelineMap(buildPipelineMap(pipeRes.data));
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

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
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: PostingStatus) => <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>,
        },
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
    ];

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Tạo tin tuyển dụng
                </Button>
            </div>

            <Table rowKey="id" loading={loading} columns={columns} dataSource={postings} pagination={{ pageSize: 10 }} />

            <PostingFormModal
                open={formModalOpen}
                editingItem={editingItem}
                onClose={() => setFormModalOpen(false)}
                onSuccess={loadAll}
            />
        </div>
    );
}