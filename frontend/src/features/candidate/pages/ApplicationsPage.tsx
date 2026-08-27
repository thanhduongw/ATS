import { useCallback, useEffect, useState, type Key, type ReactNode } from "react";
import { Table, Button, Space, Select, Modal, Form, Input, App, DatePicker, Card, Row, Col, Avatar, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import type { Dayjs } from "dayjs";
import {
    getApplications,
    advanceApplicationStage,
    rejectApplication,
    bulkAdvanceApplicationStage,
    bulkRejectApplications,
    bulkAssignApplicationRecruiter,
} from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import { getUsers } from "../../auth/authApi";
import type { ApplicationResponse, ApiMessageResponse, BulkOperationResponse } from "../types";
import type { JobPostingResponse } from "../../recruitment/types";
import type { CatalogItem, StageType } from "../../masterdata/types";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES } from "../../../app/roles";
import { useTableScrollY } from "../../../app/useTableScrollY";
import type { UserRole, UserSummaryResponse } from "../../auth/types";
import { STAGE_TYPE_LABEL } from "../../../app/statusLabels";
import { exportToExcel } from "../../../app/exportExcel";
import {
    DownloadOutlined, FolderOpenOutlined, UserAddOutlined, CalendarOutlined,
    TrophyOutlined, FileTextOutlined,
} from "@ant-design/icons";
import { COLORS, GRADIENTS } from "../../../app/theme";

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

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: ReactNode;
    gradient: string;
}

function StatCard({ title, value, subtitle, icon, gradient }: StatCardProps) {
    return (
        <Card className="stat-card" style={{ border: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="stat-icon" style={{ background: gradient }}>
                    {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500 }}>
                        {title}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                        {value}
                    </div>
                    {subtitle && (
                        <div style={{ marginTop: 6, fontSize: 12, color: COLORS.textMuted }}>{subtitle}</div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function stageDotColor(stageType: string) {
    if (stageType === "HIRED") return COLORS.stageHired;
    if (stageType === "REJECTED") return COLORS.stageRejected;
    if (stageType === "OFFER") return COLORS.stageOffer;
    if (stageType.includes("INTERVIEW")) return COLORS.stageInterview;
    if (stageType.includes("SCREENING")) return COLORS.stageScreening;
    return COLORS.stageNew;
}

function getInitials(name: string) {
    const parts = (name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name || "?").substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

export default function ApplicationsPage() {
    const { message, modal } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);

    const [rows, setRows] = useState<ApplicationResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);

    // Toàn bộ hồ sơ (không phân trang) — chỉ dùng để tính KPI, độc lập với bảng đang lọc/phân trang
    const [allApplications, setAllApplications] = useState<ApplicationResponse[]>([]);

    // Bộ lọc
    const [jobPostingId, setJobPostingId] = useState<number | undefined>();
    const [stageType, setStageType] = useState<string | undefined>();
    const [assignedRecruiterId, setAssignedRecruiterId] = useState<number | undefined>();
    const [recruitmentSourceId, setRecruitmentSourceId] = useState<number | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // Phân trang
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Nguồn dữ liệu cho các dropdown lọc
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);
    const [recruiters, setRecruiters] = useState<UserSummaryResponse[]>([]);
    const [sources, setSources] = useState<CatalogItem[]>([]);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reasons, setReasons] = useState<CatalogItem[]>([]);
    const [rejectForm] = Form.useForm();

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
                assignedRecruiterId,
                recruitmentSourceId,
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
    }, [jobPostingId, stageType, assignedRecruiterId, recruitmentSourceId, dateRange, page, pageSize, message]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setReasons(r.data));
        getPostings().then((r) => setPostings(r.data.content));
        getUsers("RECRUITER").then((r) => setRecruiters(r.data));
        getCatalogItems("/masterdata/recruitment-sources").then((r) => setSources(r.data));
        getApplications().then((r) => setAllApplications(r.data.content));
    }, []);

    const handlePass = async (id: number) => {
        try {
            await advanceApplicationStage(id, { note: "Pass sơ tuyển" });
            message.success("Đã chuyển vòng tiếp theo");
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        }
    };

    const handleReject = async () => {
        const values = await rejectForm.validateFields();
        if (!selectedId) return;
        try {
            await rejectApplication(selectedId, {
                rejectionReasonId: values.rejectionReasonId,
                note: values.note,
            });
            message.success("Đã từ chối hồ sơ");
            setRejectOpen(false);
            load();
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        }
    };

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

    const hasActiveFilters = !!(jobPostingId || stageType || assignedRecruiterId || recruitmentSourceId || dateRange);

    const handleResetFilters = () => {
        setJobPostingId(undefined);
        setStageType(undefined);
        setAssignedRecruiterId(undefined);
        setRecruitmentSourceId(undefined);
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
            width: 170,
            render: (_, r, index) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                        size={32}
                        style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length], color: "#fff", fontWeight: 600, fontSize: 12, flexShrink: 0 }}
                    >
                        {getInitials(r.candidateName)}
                    </Avatar>
                    <span style={{ fontWeight: 500, color: COLORS.textPrimary }}>{r.candidateName}</span>
                </div>
            ),
        },
        {
            title: "Vị trí ứng tuyển",
            key: "jobTitle",
            width: 150,
            ellipsis: true,
            render: (_, r) => <span style={{ fontWeight: 500 }}>{r.jobTitle || `Job #${r.jobPostingId}`}</span>,
        },
        {
            title: "Giai đoạn",
            key: "stage",
            width: 140,
            render: (_, r) => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageDotColor(r.currentStageType), flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{r.currentStageName}</span>
                </div>
            ),
        },
        {
            title: "Người phụ trách",
            dataIndex: "assignedRecruiterName",
            key: "assignedRecruiterName",
            width: 120,
            ellipsis: true,
            render: (v: string | null) => v || <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Nguồn",
            dataIndex: "recruitmentSourceName",
            key: "recruitmentSourceName",
            width: 100,
            ellipsis: true,
        },
        {
            title: "Ngày nộp",
            dataIndex: "appliedAt",
            key: "appliedAt",
            width: 95,
            render: (v: string) => (
                <span style={{ fontSize: 13 }}>{new Date(v).toLocaleDateString("vi-VN")}</span>
            ),
        },
        {
            title: "CV",
            dataIndex: "resumeUrl",
            key: "resumeUrl",
            width: 75,
            render: (url: string) =>
                url ? (
                    <Tooltip title="Xem CV">
                        <a href={url} target="_blank" rel="noreferrer">
                            <Button size="small" icon={<FileTextOutlined />} />
                        </a>
                    </Tooltip>
                ) : (
                    <span style={{ color: COLORS.textMuted }}>—</span>
                ),
        },
        ...(isHr
            ? [
                {
                    title: "Thao tác",
                    key: "actions",
                    width: 140,
                    render: (_: unknown, r: ApplicationResponse) =>
                        r.currentStageType === "REJECTED" || r.currentStageType === "HIRED" ? null : (
                            <Space>
                                <Button type="primary" size="small" onClick={() => handlePass(r.id)}>
                                    Pass
                                </Button>
                                <Button
                                    danger
                                    size="small"
                                    onClick={() => {
                                        setSelectedId(r.id);
                                        setRejectOpen(true);
                                    }}
                                >
                                    Reject
                                </Button>
                            </Space>
                        ),
                },
            ]
            : []),
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
            {/* Toolbar */}
            <div className="page-header page-shell-fixed" style={{ marginBottom: 14, justifyContent: "flex-end" }}>
                <Button icon={<DownloadOutlined />} size="large" onClick={handleExportExcel}>
                    Xuất Excel
                </Button>
            </div>

            {/* KPI stat cards */}
            <Row gutter={[12, 12]} className="page-shell-fixed" style={{ marginBottom: 14 }}>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <StatCard title="Tổng hồ sơ" value={kpiStats.total} icon={<FolderOpenOutlined />} gradient={GRADIENTS.stat1} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Đơn mới" value={kpiStats.newApplications} subtitle="7 ngày qua" icon={<UserAddOutlined />} gradient={GRADIENTS.stat2} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Sàng lọc CV" value={kpiStats.cvScreening} subtitle="đang chờ HR duyệt" icon={<FileTextOutlined />} gradient={GRADIENTS.stat3} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Phỏng vấn" value={kpiStats.interviews} subtitle="đang diễn ra" icon={<CalendarOutlined />} gradient={GRADIENTS.stat4} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Đã tuyển" value={kpiStats.hiredThisMonth} subtitle="trong tháng" icon={<TrophyOutlined />} gradient={GRADIENTS.primary} />
                </Col>
            </Row>

            <Card
                className="table-card-fill"
                style={{ border: "none", flex: 1, minHeight: 0 }}
                styles={{ body: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}
            >
                <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Vị trí tuyển dụng"
                        style={{ width: 220 }}
                        value={jobPostingId}
                        onChange={(v) => { setJobPostingId(v); setPage(1); }}
                        options={postings.map((p) => ({ value: p.id, label: p.title }))}
                    />
                    <Select
                        allowClear
                        placeholder="Giai đoạn"
                        style={{ width: 200 }}
                        value={stageType}
                        onChange={(v) => { setStageType(v); setPage(1); }}
                        options={STAGE_TYPE_OPTIONS.map((t) => ({ value: t, label: STAGE_TYPE_LABEL[t] ?? t }))}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Người phụ trách"
                        style={{ width: 200 }}
                        value={assignedRecruiterId}
                        onChange={(v) => { setAssignedRecruiterId(v); setPage(1); }}
                        options={recruiters.map((r) => ({ value: r.id, label: r.fullName }))}
                    />
                    <Select
                        allowClear
                        placeholder="Nguồn tuyển dụng"
                        style={{ width: 180 }}
                        value={recruitmentSourceId}
                        onChange={(v) => { setRecruitmentSourceId(v); setPage(1); }}
                        options={sources.map((s) => ({ value: s.id, label: String(s.name) }))}
                    />
                    <RangePicker
                        placeholder={["Nộp từ ngày", "Đến ngày"]}
                        value={dateRange}
                        onChange={(v) => { setDateRange(v as [Dayjs, Dayjs] | null); setPage(1); }}
                    />
                    {hasActiveFilters && (
                        <Button onClick={handleResetFilters}>Reset</Button>
                    )}
                </div>

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
                        rowSelection={isHr ? {
                            selectedRowKeys,
                            onChange: setSelectedRowKeys,
                        } : undefined}
                        pagination={{
                            current: page,
                            pageSize,
                            total: totalItems,
                            size: "small",
                            showSizeChanger: true,
                            pageSizeOptions: [10, 20, 50],
                            showTotal: (total) => `Tổng ${total} hồ sơ`,
                            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                        }}
                        rowHoverable
                    />
                </div>
            </Card>

            <Modal
                title="Từ chối hồ sơ"
                open={rejectOpen}
                onOk={handleReject}
                onCancel={() => setRejectOpen(false)}
                okText="Từ chối"
            >
                <Form form={rejectForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select
                            options={reasons.map((r) => ({ value: r.id, label: String(r.name) }))}
                        />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Từ chối hàng loạt (${selectedRowKeys.length} hồ sơ)`}
                open={bulkRejectOpen}
                onOk={handleBulkReject}
                onCancel={() => setBulkRejectOpen(false)}
                okText="Từ chối"
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
                title={`Gán người phụ trách hàng loạt (${selectedRowKeys.length} hồ sơ)`}
                open={bulkAssignOpen}
                onOk={handleBulkAssign}
                onCancel={() => setBulkAssignOpen(false)}
                okText="Gán"
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
