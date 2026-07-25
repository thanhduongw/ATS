import { useCallback, useEffect, useState } from "react";
import { Table, Button, Tag, Segmented, App } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { getRequisitions } from "../recruitmentApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, JobRequisitionResponse, RequisitionStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import RequisitionFormModal from "./RequisitionFormModal";
import RequisitionDetailDrawer from "./RequisitionDetailDrawer";

const STATUS_COLOR: Record<RequisitionStatus, string> = {
    DRAFT: "default",
    PENDING_APPROVAL: "gold",
    APPROVED: "green",
    REJECTED: "red",
};

const STATUS_LABEL: Record<RequisitionStatus, string> = {
    DRAFT: "Bản nháp",
    PENDING_APPROVAL: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
};

export default function RequisitionListPanel() {
    const { message } = App.useApp();
    const currentUser = useAppSelector((state) => state.auth.user);
    const [requisitions, setRequisitions] = useState<JobRequisitionResponse[]>([]);
    const [departmentMap, setDepartmentMap] = useState<Record<number, string>>({});
    const [jobTitleMap, setJobTitleMap] = useState<Record<number, string>>({});
    const [jobLevelMap, setJobLevelMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [filterMode, setFilterMode] = useState<"all" | "pendingForMe">("all");

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<JobRequisitionResponse | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<JobRequisitionResponse | null>(null);

    const buildMap = (items: CatalogItem[]): Record<number, string> =>
        Object.fromEntries(items.map((i) => [i.id, i.name as string]));

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [reqRes, deptRes, titleRes, levelRes] = await Promise.all([
                getRequisitions(),
                getCatalogItems("/masterdata/departments"),
                getCatalogItems("/masterdata/job-titles"),
                getCatalogItems("/masterdata/job-levels"),
            ]);
            setRequisitions(reqRes.data);
            setDepartmentMap(buildMap(deptRes.data));
            setJobTitleMap(buildMap(titleRes.data));
            setJobLevelMap(buildMap(levelRes.data));
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

    const displayedData =
        filterMode === "pendingForMe"
            ? requisitions.filter(
                (r) => r.status === "PENDING_APPROVAL" && currentUser?.userId === String(r.approverId)
            )
            : requisitions;

    const openCreate = () => {
        setEditingItem(null);
        setFormModalOpen(true);
    };

    const openDetail = (item: JobRequisitionResponse) => {
        setSelectedItem(item);
        setDetailOpen(true);
    };

    const openEditFromDrawer = (item: JobRequisitionResponse) => {
        setDetailOpen(false);
        setEditingItem(item);
        setFormModalOpen(true);
    };

    const columns = [
        { title: "Tiêu đề", dataIndex: "title", key: "title" },
        {
            title: "Phòng ban",
            dataIndex: "departmentId",
            key: "departmentId",
            render: (id: number) => departmentMap[id] ?? "—",
        },
        {
            title: "Chức vụ",
            dataIndex: "jobTitleId",
            key: "jobTitleId",
            render: (id: number) => jobTitleMap[id] ?? "—",
        },
        { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
        { title: "Người duyệt", dataIndex: "approverName", key: "approverName" },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: RequisitionStatus) => <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>,
        },
        {
            title: "",
            key: "actions",
            render: (_: unknown, record: JobRequisitionResponse) => (
                <Button type="link" onClick={() => openDetail(record)}>
                    Xem chi tiết
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <Segmented
                    value={filterMode}
                    onChange={(value) => setFilterMode(value as "all" | "pendingForMe")}
                    options={[
                        { label: "Tất cả", value: "all" },
                        { label: "Chờ tôi duyệt", value: "pendingForMe" },
                    ]}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Tạo yêu cầu tuyển dụng
                </Button>
            </div>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={displayedData}
                pagination={{ pageSize: 10 }}
            />

            <RequisitionFormModal
                open={formModalOpen}
                editingItem={editingItem}
                onClose={() => setFormModalOpen(false)}
                onSuccess={loadAll}
            />

            <RequisitionDetailDrawer
                open={detailOpen}
                requisition={selectedItem}
                departmentMap={departmentMap}
                jobTitleMap={jobTitleMap}
                jobLevelMap={jobLevelMap}
                onClose={() => setDetailOpen(false)}
                onChanged={loadAll}
                onEdit={openEditFromDrawer}
            />
        </div>
    );
}