import { useCallback, useEffect, useState, type Key } from "react";
import { Table, Button, Select, Modal, Form, Input, App, DatePicker, Card, Avatar, Tooltip, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useSearchParams } from "react-router-dom";
import { getCandidates } from "../candidateApi";
import { useTrailNavigate } from "../../../app/useNavTrail";
import type { AxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import {
    getApplications,
    bulkAdvanceApplicationStage,
    bulkRejectApplications,
    bulkAssignApplicationRecruiter,
} from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getUserDirectory } from "../../auth/authApi";
import type { ApplicationResponse, ApiMessageResponse, BulkOperationResponse } from "../types";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem, StageType } from "../../masterdata/types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { useTableScrollY } from "../../../app/useTableScrollY";
import type { UserRole, UserDirectoryResponse } from "../../auth/types";
import { STAGE_TYPE_LABEL, stageTypeTagColor } from "../../../app/statusLabels";
import { exportToExcel } from "../../../app/exportExcel";
import {
    DownloadOutlined, FolderOpenOutlined, UserAddOutlined, CalendarOutlined,
    TrophyOutlined, FileTextOutlined, CloseOutlined,
} from "@ant-design/icons";
import { COLORS, GRADIENTS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, FilterBar, ModalTitle } from "../../../components/ui/pageKit";
import { listCardStyle, listCardBodyStyle, listPagination } from "../../../components/ui/listStyles";

const { RangePicker } = DatePicker;

const STAGE_TYPE_OPTIONS: StageType[] = [
    "APPLIED",
    "CV_SCREENING",
    "HR_SCREENING",
    "TECHNICAL_INTERVIEW",
    "HR_INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
    "HIRED",
    "REJECTED",
    "CUSTOM",
];

const INTERVIEW_STAGE_TYPES = ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"];

function getInitials(name: string) {
    const parts = (name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "?").substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

export default function ApplicationsPage() {
    const { message, modal } = App.useApp();
    const openApplication = useTrailNavigate();
    const [searchParams] = useSearchParams();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [rows, setRows] = useState<ApplicationResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);

    // Toàn bộ hồ sơ (không phân trang) — chỉ dùng để tính KPI, độc lập với bảng đang lọc/phân trang
    const [allApplications, setAllApplications] = useState<ApplicationResponse[]>([]);

    // Bộ lọc
    const [departmentId, setDepartmentId] = useState<number | undefined>();
    const [jobPostingId, setJobPostingId] = useState<number | undefined>();
    const [stageType, setStageType] = useState<string | undefined>(
        () => searchParams.get("stageType") ?? undefined,
    );
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // Phân trang
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Nguồn dữ liệu cho các dropdown lọc
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [departments, setDepartments] = useState<CatalogItem[]>([]);
    /** candidateId -> email/phone, vì ApplicationResponse không mang sẵn thông tin liên hệ. */
    const [contactById, setContactById] = useState<Map<number, { email: string; phone: string }>>(new Map());
    const [recruiters, setRecruiters] = useState<UserDirectoryResponse[]>([]);

    const [reasons, setReasons] = useState<CatalogItem[]>([]);

    // Bulk actions
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkForm] = Form.useForm();
    const [bulkAssignForm] = Form.useForm();
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    const { wrapRef, scrollY } = useTableScrollY([loading, rows.length]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplications({
                jobPostingId,
                stageType,
                appliedFrom: dateRange ? dateRange[0].format("YYYY-MM-DD") : undefined,
                appliedTo: dateRange ? dateRange[1].format("YYYY-MM-DD") : undefined,
                page: page - 1,
                size: pageSize,
            });
            setRows(res.data.content);
            setTotalItems(res.data.totalItems);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không tải được danh sách");
        } finally {
            setLoading(false);
        }
    }, [jobPostingId, stageType, dateRange, page, pageSize, message]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data));
        getCatalogItems("/masterdata/departments").then((r) => setDepartments(r.data));
        getPostings({ size: 1000 }).then((r) => setPostings(r.data.content));
        getUserDirectory("RECRUITER").then((r) => setRecruiters(r.data));
        getApplications().then((r) => setAllApplications(r.data.content));
        getCandidates({ size: 1000 })
            .then((r) => setContactById(new Map(
                r.data.content.map((c) => [c.id, { email: c.email ?? "", phone: c.phone ?? "" }]),
            )))
            // Thieu lien he chi lam mat hai dong phu, khong duoc chan danh sach.
            .catch(() => setContactById(new Map()));
    }, []);

    const reportBulkResult = (result: BulkOperationResponse) => {
        const failedCount = Object.keys(result.failedIds).length;
        if (failedCount === 0) {
            message.success(`Đã xử lý thành công ${result.succeededIds.length} hồ sơ`);
        } else {
            message.warning(
                `Thành công ${result.succeededIds.length} hồ sơ, thất bại ${failedCount} hồ sơ (xem lý do trong console)`
            );
            console.warn("Bulk action failures:", result.failedIds);
        }
        setSelectedRowKeys([]);
        load();
    };

    const handleBulkAdvance = () => {
        modal.confirm({
            title: `Chuyển vòng cho ${selectedRowKeys.length} hồ sơ đã chọn?`,
            content: "Mỗi hồ sơ sẽ được chuyển sang giai đoạn kế tiếp trong quy trình tuyển dụng của nó.",
            okText: "Chuyển vòng",
            onOk: async () => {
                const res = await bulkAdvanceApplicationStage(selectedRowKeys as number[], "Chuyển vòng hàng loạt");
                reportBulkResult(res.data);
            },
        });
    };

    const handleBulkReject = async () => {
        const values = await bulkForm.validateFields();
        setBulkSubmitting(true);
        try {
            const res = await bulkRejectApplications(selectedRowKeys as number[], values.rejectionReasonId, values.note);
            setBulkRejectOpen(false);
            bulkForm.resetFields();
            reportBulkResult(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleBulkAssign = async () => {
        const values = await bulkAssignForm.validateFields();
        setBulkSubmitting(true);
        try {
            const res = await bulkAssignApplicationRecruiter(selectedRowKeys as number[], values.assignedRecruiterId);
            setBulkAssignOpen(false);
            bulkAssignForm.resetFields();
            reportBulkResult(res.data);
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const hasActiveFilters = !!(departmentId || jobPostingId || stageType || dateRange);

    const handleResetFilters = () => {
        setDepartmentId(undefined);
        setJobPostingId(undefined);
        setStageType(undefined);
        setDateRange(null);
        setPage(1);
    };

    // ── KPI (dựa trên toàn bộ hồ sơ, không phụ thuộc bộ lọc/phân trang của bảng) ──
    const kpiStats = (() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const newApplications = allApplications.filter((a) => new Date(a.appliedAt) >= sevenDaysAgo).length;
        const cvScreening = allApplications.filter((a) => a.currentStageType === "CV_SCREENING").length;
        const interviews = allApplications.filter((a) => INTERVIEW_STAGE_TYPES.includes(a.currentStageType)).length;
        const hiredThisMonth = allApplications.filter((a) => {
            if (!a.hiredAt) return false;
            const d = new Date(a.hiredAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        return { total: allApplications.length, newApplications, cvScreening, interviews, hiredThisMonth };
    })();

    const columns: ColumnsType<ApplicationResponse> = [
        {
            title: "Ứng viên",
            key: "candidateName",
            width: 350,
            render: (_, r, index) => {
                const contact = contactById.get(r.candidateId);
                const line = [contact?.email, contact?.phone].filter(Boolean).join(" · ");
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar
                            size={32}
                            style={{
                                background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                                color: "#fff", fontWeight: 600, fontSize: 12, flexShrink: 0,
                            }}
                        >
                            {getInitials(r.candidateName)}
                        </Avatar>
                        <div className="cell-stack">
                            <div style={{ fontWeight: 500, color: COLORS.textPrimary }}>
                                {r.candidateName}
                            </div>
                            <Tooltip title={line || undefined}>
                                <div className="cell-stack-sub">{line}</div>
                            </Tooltip>
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Vị trí ứng tuyển",
            key: "jobTitle",
            ellipsis: true,
            render: (_, r) => <span style={{ fontWeight: 500 }}>{r.jobTitle || `Job #${r.jobPostingId}`}</span>,
        },
        {
            title: "Ngày nộp",
            dataIndex: "appliedAt",
            key: "appliedAt",
            width: 160,
            render: (v: string) => (
                <span style={{ fontSize: 13 }}>{new Date(v).toLocaleDateString("vi-VN")}</span>
            ),
        },
        {
            title: "Giai đoạn",
            key: "stage",
            width: 200,
            render: (_, r) => (
                <Tag color={stageTypeTagColor(r.currentStageType)} style={{ margin: 0 }}>
                    {r.currentStageName}
                </Tag>
            ),
        },
    ];

    const handleExportExcel = () => {
        exportToExcel(
            "ho-so-ung-tuyen",
            [
                { header: "Ứng viên", value: (r: ApplicationResponse) => r.candidateName },
                { header: "Vị trí ứng tuyển", value: (r: ApplicationResponse) => r.jobTitle || `Job #${r.jobPostingId}` },
                { header: "Giai đoạn", value: (r: ApplicationResponse) => r.currentStageName },
                { header: "Người phụ trách", value: (r: ApplicationResponse) => r.assignedRecruiterName },
                { header: "Nguồn", value: (r: ApplicationResponse) => r.recruitmentSourceName },
                { header: "Ngày nộp", value: (r: ApplicationResponse) => new Date(r.appliedAt).toLocaleDateString("vi-VN") },
            ],
            rows,
        );
    };

    return (
        <div className="page-shell animate-fade-in">
            {/* ── Thống kê nhanh ─────────────────────────── */}
            <StatRow>
                <StatTile
                    icon={<FolderOpenOutlined />}
                    label="Tổng hồ sơ"
                    value={kpiStats.total}
                    accent={COLORS.primary}
                    active={!hasActiveFilters}
                    onClick={handleResetFilters}
                />
                <StatTile
                    icon={<UserAddOutlined />}
                    label="Đơn mới"
                    hint="7 ngày qua"
                    value={kpiStats.newApplications}
                    accent="#3B82F6"
                    active={!!dateRange}
                    onClick={() => {
                        setDateRange([dayjs().subtract(7, "day"), dayjs()]);
                        setPage(1);
                    }}
                />
                <StatTile
                    icon={<FileTextOutlined />}
                    label="Sàng lọc CV"
                    hint="chờ duyệt"
                    value={kpiStats.cvScreening}
                    accent="#F59E0B"
                    active={stageType === "CV_SCREENING"}
                    onClick={() => {
                        setStageType(stageType === "CV_SCREENING" ? undefined : "CV_SCREENING");
                        setPage(1);
                    }}
                />
                <StatTile
                    icon={<CalendarOutlined />}
                    label="Phỏng vấn"
                    hint="đang diễn ra"
                    value={kpiStats.interviews}
                    accent="#8B5CF6"
                />
                <StatTile
                    icon={<TrophyOutlined />}
                    label="Đã tuyển"
                    hint="trong tháng"
                    value={kpiStats.hiredThisMonth}
                    accent={COLORS.success}
                    active={stageType === "HIRED"}
                    onClick={() => {
                        setStageType(stageType === "HIRED" ? undefined : "HIRED");
                        setPage(1);
                    }}
                />
            </StatRow>

            {/* ── Bộ lọc ─────────────────────────────────── */}
            <FilterBar
                extra={
                    <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
                        Xuất Excel
                    </Button>
                }
            >
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Phòng ban"
                    style={{ width: 200 }}
                    value={departmentId}
                    onChange={(v) => {
                        setDepartmentId(v);
                        setJobPostingId(undefined);
                        setPage(1);
                    }}
                    options={departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={departmentId == null ? "Chọn phòng ban trước" : "Vị trí tuyển dụng"}
                    style={{ width: 240 }}
                    disabled={departmentId == null}
                    value={jobPostingId}
                    onChange={(v) => { setJobPostingId(v); setPage(1); }}
                    notFoundContent="Phòng ban này chưa có tin tuyển dụng"
                    options={postings
                        .filter((p) => p.departmentId === departmentId)
                        .map((p) => ({ value: p.id, label: p.title }))}
                />
                <Select
                    allowClear
                    placeholder="Giai đoạn"
                    style={{ width: 180 }}
                    value={stageType}
                    onChange={(v) => { setStageType(v); setPage(1); }}
                    options={STAGE_TYPE_OPTIONS.map((t) => ({ value: t, label: STAGE_TYPE_LABEL[t] ?? t }))}
                />
                <RangePicker
                    placeholder={["Nộp từ ngày", "Đến ngày"]}
                    format="DD/MM/YYYY"
                    value={dateRange}
                    onChange={(v) => { setDateRange(v as [Dayjs, Dayjs] | null); setPage(1); }}
                />
                {hasActiveFilters && <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>}
            </FilterBar>

            <Card
                className="table-card-fill"
                style={listCardStyle}
                styles={{ body: listCardBodyStyle }}
            >
                {isHr && selectedRowKeys.length > 0 && (
                    <div
                        style={{
                            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                            padding: "10px 16px", marginBottom: 12, background: "#EFF6FF",
                            border: "1px solid #BFDBFE", borderRadius: 8, flexShrink: 0,
                        }}
                    >
                        <span>Đã chọn {selectedRowKeys.length} hồ sơ</span>
                        <Button size="small" type="primary" onClick={handleBulkAdvance}>
                            Chuyển vòng hàng loạt
                        </Button>
                        <Button size="small" danger onClick={() => setBulkRejectOpen(true)}>
                            Reject hàng loạt
                        </Button>
                        <Button size="small" onClick={() => setBulkAssignOpen(true)}>
                            Gán người phụ trách hàng loạt
                        </Button>
                        <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn
                        </Button>
                    </div>
                )}

                <div ref={wrapRef} className="table-scroll-wrap">
                    <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        sticky
                        scroll={{ y: scrollY }}
                        onRow={(record) => ({
                            onClick: (event) => {
                                // Bam o chon hang loat thi chi tick, khong mo chi tiet.
                                if ((event.target as HTMLElement).closest(".ant-table-selection-column")) return;
                                openApplication(`/candidates/${record.candidateId}/applications/${record.id}`);
                            },
                            style: { cursor: "pointer" },
                        })}
                        rowSelection={isHr ? {
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        } : undefined}
                        pagination={{
                            current: page,
                            pageSize,
                            total: totalItems,
                            ...listPagination("hồ sơ"),
                            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                        }}
                        locale={{
                            emptyText: loading ? <span /> : (
                                <EmptyState
                                    title="Chưa có hồ sơ ứng tuyển nào"
                                    description="Hồ sơ phù hợp với bộ lọc hiện tại sẽ hiển thị ở đây."
                                />
                            ),
                        }}
                        rowHoverable
                    />
                </div>
            </Card>

            <Modal
                title={
                    <ModalTitle
                        icon={<CloseOutlined />}
                        title="Từ chối hàng loạt"
                        subtitle={`${selectedRowKeys.length} hồ sơ được chọn · gửi email tự động`}
                        accent={COLORS.error}
                    />
                }
                open={bulkRejectOpen}
                onOk={handleBulkReject}
                onCancel={() => setBulkRejectOpen(false)}
                okText="Từ chối"
                cancelText="Hủy"
                confirmLoading={bulkSubmitting}
                okButtonProps={{ danger: true }}
            >
                <Form form={bulkForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select options={reasons.map((r) => ({ value: r.id, label: String(r.name) }))} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={
                    <ModalTitle
                        icon={<UserAddOutlined />}
                        title="Gán người phụ trách"
                        subtitle={`${selectedRowKeys.length} hồ sơ được chọn`}
                    />
                }
                open={bulkAssignOpen}
                onOk={handleBulkAssign}
                onCancel={() => setBulkAssignOpen(false)}
                okText="Gán"
                cancelText="Hủy"
                confirmLoading={bulkSubmitting}
            >
                <Form form={bulkAssignForm} layout="vertical">
                    <Form.Item
                        name="assignedRecruiterId"
                        label="Người phụ trách"
                        rules={[{ required: true, message: "Chọn người phụ trách" }]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
