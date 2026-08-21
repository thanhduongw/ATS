import { useCallback, useEffect, useState, useMemo, type Key, type ReactNode } from "react";
import { App, Card, Table, Button, Space, Input, Select, Row, Col, Tooltip, Avatar, Modal, Form } from "antd";
import {
    PlusOutlined, SearchOutlined, UserOutlined, DownloadOutlined,
    UserAddOutlined, FileSearchOutlined, CalendarOutlined, TrophyOutlined, MailOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import type { ColumnsType } from "antd/es/table";
import { getCandidates } from "../candidateApi";
import { getApplications, bulkAdvanceApplicationStage, bulkRejectApplications } from "../applicationApi";
import { getCatalogItems } from "../../masterdata/masterdataApi";
import type { CatalogItem } from "../../masterdata/types";
import type { ApiMessageResponse, CandidateResponse, ApplicationResponse, CandidateWithApplications, BulkOperationResponse } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import AiScoreBadge from "../../../components/AiScoreBadge";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { exportToExcel } from "../../../app/exportExcel";

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

const INTERVIEW_STAGE_TYPES = ["TECHNICAL_INTERVIEW", "HR_INTERVIEW", "FINAL_INTERVIEW"];

const DEPARTMENT_DOT_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#06B6D4"];
function departmentDotColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return DEPARTMENT_DOT_COLORS[hash % DEPARTMENT_DOT_COLORS.length];
}

function stageDotColor(stageType: string) {
    if (stageType === "HIRED") return COLORS.stageHired;
    if (stageType === "REJECTED") return COLORS.stageRejected;
    if (stageType === "OFFER") return COLORS.stageOffer;
    if (stageType.includes("INTERVIEW")) return COLORS.stageInterview;
    if (stageType.includes("SCREENING")) return COLORS.stageScreening;
    return COLORS.stageNew;
}

/** Chưa có dữ liệu AI thật (tính năng đang phát triển) — giữ chỗ để bật sort ngay khi có điểm thật. */
function getAiScore(_record: CandidateWithApplications): number | undefined {
    return undefined;
}

export default function CandidatesPage() {
    const { notification, message, modal } = App.useApp();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [allApplications, setAllApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
    const [positionFilter, setPositionFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formModalOpen, setFormModalOpen] = useState(false);

    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    const [rejectReasons, setRejectReasons] = useState<CatalogItem[]>([]);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkRejectForm] = Form.useForm();

    // Debounce ô tìm kiếm trước khi gọi API; đổi từ khóa thì quay về trang 1
    useEffect(() => {
        const t = setTimeout(() => {
            setKeyword(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        getCatalogItems("/masterdata/rejection-reasons").then((r) => setRejectReasons(r.data));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [candRes, appRes] = await Promise.all([
                getCandidates({ keyword: keyword || undefined, page: page - 1, size: pageSize }),
                getApplications(),          // lấy tất cả đơn ứng tuyển (không phân trang) để gộp vào từng ứng viên + thống kê
            ]);
            setCandidates(candRes.data.content);
            setTotalCandidates(candRes.data.totalItems);
            setAllApplications(appRes.data.content);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            notification.error({
                message: "Không tải được dữ liệu",
                description: axiosErr.response?.data?.message ?? "Vui lòng kiểm tra kết nối và thử lại.",
                placement: "topRight",
            });
        } finally {
            setLoading(false);
        }
    }, [notification, keyword, page, pageSize]);

    useEffect(() => { loadData(); }, [loadData]);

    // Gộp ứng viên (trang hiện tại) + danh sách vị trí đã ứng tuyển, ứng tuyển gần nhất lên đầu
    const candidatesWithApps: CandidateWithApplications[] = useMemo(() => {
        const appByCandidate = allApplications.reduce<Record<number, ApplicationResponse[]>>((acc, app) => {
            (acc[app.candidateId] ??= []).push(app);
            return acc;
        }, {});

        return candidates.map((c) => ({
            ...c,
            applications: appByCandidate[c.id] ?? [],
        }));
    }, [candidates, allApplications]);

    const visibleCandidates = useMemo(() => {
        return candidatesWithApps.filter((c) => {
            if (departmentFilter && !c.applications.some((a) => a.departmentName === departmentFilter)) return false;
            if (positionFilter && !c.applications.some((a) => a.jobTitle === positionFilter)) return false;
            if (statusFilter && !c.applications.some((a) => a.currentStageName === statusFilter)) return false;
            return true;
        });
    }, [candidatesWithApps, departmentFilter, positionFilter, statusFilter]);

    const hasActiveFilters = !!(keyword || departmentFilter || positionFilter || statusFilter);

    const handleResetFilters = () => {
        setSearchInput("");
        setKeyword("");
        setDepartmentFilter(null);
        setPositionFilter(null);
        setStatusFilter(null);
        setPage(1);
    };

    // ── Thống kê KPI (dựa trên toàn bộ đơn ứng tuyển của công ty) ──
    const kpiStats = useMemo(() => {
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
        return { newApplications, cvScreening, interviews, hiredThisMonth };
    }, [allApplications]);

    // ── Phân bổ ứng viên theo phòng ban (đếm ứng viên duy nhất theo departmentName) ──
    const departmentBreakdown = useMemo(() => {
        const candidateIdsByDept = new Map<string, Set<number>>();
        for (const app of allApplications) {
            if (!app.departmentName) continue;
            if (!candidateIdsByDept.has(app.departmentName)) candidateIdsByDept.set(app.departmentName, new Set());
            candidateIdsByDept.get(app.departmentName)!.add(app.candidateId);
        }
        return Array.from(candidateIdsByDept.entries())
            .map(([name, ids]) => ({ name, count: ids.size }))
            .sort((a, b) => b.count - a.count);
    }, [allApplications]);

    // ── Danh sách vị trí / trạng thái thực tế để đổ vào bộ lọc ──
    const positionOptions = useMemo(() => {
        return Array.from(new Set(allApplications.map((a) => a.jobTitle).filter((v): v is string => !!v))).sort();
    }, [allApplications]);

    const statusOptions = useMemo(() => {
        return Array.from(new Set(allApplications.map((a) => a.currentStageName).filter(Boolean))).sort();
    }, [allApplications]);

    /** ID của đơn ứng tuyển gần nhất cho mỗi ứng viên đang được chọn (bỏ qua ứng viên chưa ứng tuyển). */
    const getSelectedApplicationIds = () => {
        const ids: number[] = [];
        let skipped = 0;
        for (const key of selectedRowKeys) {
            const primary = candidatesWithApps.find((c) => c.id === key)?.applications[0];
            if (primary) ids.push(primary.id); else skipped++;
        }
        return { ids, skipped };
    };

    const reportBulkResult = (res: BulkOperationResponse, verb: string) => {
        const failedCount = Object.keys(res.failedIds).length;
        if (failedCount === 0) {
            message.success(`Đã ${verb} và gửi email cho ${res.succeededIds.length} hồ sơ`);
        } else {
            message.warning(`${res.succeededIds.length} hồ sơ thành công, ${failedCount} hồ sơ thất bại`);
            console.warn("Bulk action failures:", res.failedIds);
        }
        setSelectedRowKeys([]);
        loadData();
    };

    const handleBulkAdvance = () => {
        const { ids, skipped } = getSelectedApplicationIds();
        if (ids.length === 0) {
            message.warning("Các ứng viên đã chọn chưa có hồ sơ ứng tuyển nào để chuyển trạng thái");
            return;
        }
        modal.confirm({
            title: `Chuyển trạng thái cho ${ids.length} hồ sơ đã chọn?`,
            content: `Mỗi hồ sơ sẽ chuyển sang giai đoạn kế tiếp trong quy trình tuyển dụng và ứng viên sẽ nhận email thông báo tự động.${skipped ? ` (${skipped} ứng viên chưa ứng tuyển sẽ được bỏ qua.)` : ""}`,
            okText: "Chuyển & gửi email",
            onOk: async () => {
                const res = await bulkAdvanceApplicationStage(ids, "Chuyển trạng thái hàng loạt");
                reportBulkResult(res.data, "chuyển trạng thái");
            },
        });
    };

    const handleBulkReject = async () => {
        const values = await bulkRejectForm.validateFields();
        const { ids, skipped } = getSelectedApplicationIds();
        if (ids.length === 0) {
            message.warning("Các ứng viên đã chọn chưa có hồ sơ ứng tuyển nào để từ chối");
            return;
        }
        setBulkSubmitting(true);
        try {
            const res = await bulkRejectApplications(ids, values.rejectionReasonId, values.note);
            setBulkRejectOpen(false);
            bulkRejectForm.resetFields();
            if (skipped) message.info(`Đã bỏ qua ${skipped} ứng viên chưa ứng tuyển`);
            reportBulkResult(res.data, "từ chối");
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Thất bại");
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleExportExcel = () => {
        exportToExcel(
            "ung-vien",
            [
                { header: "Họ tên", value: (c: CandidateWithApplications) => c.fullName },
                { header: "Email", value: (c: CandidateWithApplications) => c.email },
                { header: "Điện thoại", value: (c: CandidateWithApplications) => c.phone },
                { header: "Phòng ban", value: (c: CandidateWithApplications) => Array.from(new Set(c.applications.map((a) => a.departmentName).filter(Boolean))).join(", ") },
                { header: "Vị trí ứng tuyển", value: (c: CandidateWithApplications) => c.applications.map((a) => a.jobTitle).join(", ") },
                { header: "Trạng thái", value: (c: CandidateWithApplications) => c.applications[0]?.currentStageName },
                { header: "Ngày ứng tuyển", value: (c: CandidateWithApplications) => c.applications[0]?.appliedAt },
            ],
            visibleCandidates,
        );
    };

    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

    const goToApplication = (candidateId: number, applicationId: number) => {
        navigate(`/candidates/${candidateId}/applications/${applicationId}`);
    };

    const columns: ColumnsType<CandidateWithApplications> = [
        {
            title: "Ứng viên",
            key: "candidate",
            width: 240,
            render: (_, record, index) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                        size={36}
                        style={{
                            background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                            color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0,
                        }}
                    >
                        {getInitials(record.fullName)}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>{record.fullName}</div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{record.email}</div>
                        {record.phone && (
                            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{record.phone}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "Vị trí",
            key: "position",
            width: 200,
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Chưa ứng tuyển</span>;
                return (
                    <div>
                        <div style={{ fontWeight: 500, color: COLORS.textPrimary }}>{primary.jobTitle || `Job #${primary.jobPostingId}`}</div>
                        {record.applications.length > 1 && (
                            <Tooltip title={record.applications.slice(1).map((a) => a.jobTitle).join(", ")}>
                                <div style={{ fontSize: 11, color: COLORS.textMuted }}>+{record.applications.length - 1} vị trí khác</div>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Phòng ban",
            key: "department",
            width: 150,
            render: (_, record) => {
                const name = record.applications[0]?.departmentName;
                if (!name) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: departmentDotColor(name), flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{name}</span>
                    </div>
                );
            },
        },
        {
            title: "Ngày ứng tuyển",
            key: "appliedAt",
            width: 130,
            sorter: (a, b) => {
                const ta = a.applications[0] ? new Date(a.applications[0].appliedAt).getTime() : 0;
                const tb = b.applications[0] ? new Date(b.applications[0].appliedAt).getTime() : 0;
                return ta - tb;
            },
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <span style={{ fontSize: 13 }}>
                        {new Date(primary.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                );
            },
        },
        {
            title: "Trạng thái",
            key: "status",
            width: 150,
            render: (_, record) => {
                const primary = record.applications[0];
                if (!primary) return <span style={{ color: COLORS.textMuted }}>—</span>;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageDotColor(primary.currentStageType), flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{primary.currentStageName}</span>
                    </div>
                );
            },
        },
        {
            title: "AI Score",
            key: "aiScore",
            width: 130,
            sorter: (a, b) => (getAiScore(a) ?? -1) - (getAiScore(b) ?? -1),
            render: (_, record) => <AiScoreBadge score={getAiScore(record)} />,
        },
    ];

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.stat2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <UserOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Ứng viên</h2>
                        <div className="page-header-subtitle">Quản lý, sàng lọc và đánh giá ứng viên trong quy trình tuyển dụng.</div>
                    </div>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} size="large" onClick={handleExportExcel}>
                        Xuất Excel
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} size="large"
                        onClick={() => setFormModalOpen(true)}>
                        Thêm ứng viên
                    </Button>
                </Space>
            </div>

            {/* KPI stat cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <StatCard title="Tổng ứng viên" value={totalCandidates} icon={<UserOutlined />} gradient={GRADIENTS.stat1} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Đơn mới" value={kpiStats.newApplications} subtitle="7 ngày qua" icon={<UserAddOutlined />} gradient={GRADIENTS.stat2} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Sàng lọc CV" value={kpiStats.cvScreening} subtitle="đang chờ duyệt" icon={<FileSearchOutlined />} gradient={GRADIENTS.stat3} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Phỏng vấn" value={kpiStats.interviews} subtitle="đang diễn ra" icon={<CalendarOutlined />} gradient={GRADIENTS.stat4} />
                </Col>
                <Col xs={24} sm={12} md={8} lg={5}>
                    <StatCard title="Đã tuyển" value={kpiStats.hiredThisMonth} subtitle="trong tháng" icon={<TrophyOutlined />} gradient={GRADIENTS.primary} />
                </Col>
            </Row>

            <Card style={{ border: "none" }}>
                <Input
                    prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                    placeholder="Tìm theo tên, email hoặc số điện thoại..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    style={{ marginBottom: 12 }}
                    size="large"
                    allowClear
                />
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <Select
                        allowClear
                        placeholder="Tất cả phòng ban"
                        style={{ width: 180 }}
                        value={departmentFilter}
                        onChange={(v) => { setDepartmentFilter(v ?? null); setPage(1); }}
                        options={departmentBreakdown.map((d) => ({ value: d.name, label: `${d.name} (${d.count})` }))}
                    />
                    <Select
                        allowClear
                        showSearch
                        placeholder="Tất cả vị trí"
                        style={{ width: 180 }}
                        value={positionFilter}
                        onChange={(v) => { setPositionFilter(v ?? null); setPage(1); }}
                        options={positionOptions.map((p) => ({ value: p, label: p }))}
                    />
                    <Select
                        allowClear
                        placeholder="Tất cả trạng thái"
                        style={{ width: 180 }}
                        value={statusFilter}
                        onChange={(v) => { setStatusFilter(v ?? null); setPage(1); }}
                        options={statusOptions.map((s) => ({ value: s, label: s }))}
                    />
                    {hasActiveFilters && (
                        <Button onClick={handleResetFilters}>Reset</Button>
                    )}
                </div>

                {selectedRowKeys.length > 0 && (
                    <div
                        style={{
                            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                            padding: "10px 16px", marginBottom: 16, background: "#EFF6FF",
                            border: "1px solid #BFDBFE", borderRadius: 8,
                        }}
                    >
                        <span>Đã chọn {selectedRowKeys.length} ứng viên</span>
                        <Button size="small" type="primary" icon={<MailOutlined />} onClick={handleBulkAdvance}>
                            Chuyển trạng thái & gửi email
                        </Button>
                        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setBulkRejectOpen(true)}>
                            Từ chối hàng loạt
                        </Button>
                        <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn
                        </Button>
                    </div>
                )}

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={visibleCandidates}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    }}
                    onRow={(record) => {
                        const primary = record.applications[0];
                        return {
                            onClick: () => { if (primary) goToApplication(record.id, primary.id); },
                            style: { cursor: primary ? "pointer" : "default" },
                        };
                    }}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalCandidates,
                        size: "small",
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        showTotal: (total) => `Tổng ${total} ứng viên`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    scroll={{ x: 1050 }}
                    rowHoverable
                />
            </Card>

            <CandidateFormModal open={formModalOpen} editingItem={null}
                onClose={() => setFormModalOpen(false)} onSuccess={loadData} />

            <Modal
                title={`Từ chối hàng loạt (${selectedRowKeys.length} ứng viên)`}
                open={bulkRejectOpen}
                onOk={handleBulkReject}
                onCancel={() => setBulkRejectOpen(false)}
                okText="Từ chối & gửi email"
                confirmLoading={bulkSubmitting}
                okButtonProps={{ danger: true }}
            >
                <Form form={bulkRejectForm} layout="vertical">
                    <Form.Item
                        name="rejectionReasonId"
                        label="Lý do"
                        rules={[{ required: true, message: "Chọn lý do" }]}
                    >
                        <Select options={rejectReasons.map((r) => ({ value: r.id, label: String(r.name) }))} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
