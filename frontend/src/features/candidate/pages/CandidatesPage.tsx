import { useCallback, useEffect, useState, useMemo, type Key } from "react";
import { App, Card, Table, Button, Tag, Space, Input, Select, Row, Col, Tooltip, Avatar, Segmented, Popover } from "antd";
import { PlusOutlined, UploadOutlined, SendOutlined, SearchOutlined, UserOutlined, FilePdfOutlined, FileUnknownOutlined, DeleteOutlined, DownloadOutlined, TagOutlined, CloseOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { ColumnsType } from "antd/es/table";
import { getCandidates, bulkDeleteCandidates, addCandidateTag, removeCandidateTag } from "../candidateApi";
import { getApplications } from "../applicationApi";
import type { ApiMessageResponse, CandidateResponse, ApplicationResponse, CandidateWithApplications } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import CvUploadModal from "../components/CvUploadModal";
import ApplicationCreateModal from "../components/ApplicationCreateModal";
import { COLORS, GRADIENTS } from "../../../app/theme";
import { exportToExcel } from "../../../app/exportExcel";

export default function CandidatesPage() {
    const { notification, message, modal } = App.useApp();
    const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [cvBreakdown, setCvBreakdown] = useState({ withCv: 0, withoutCv: 0 });
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [filterCvStatus, setFilterCvStatus] = useState<"all" | "has_cv" | "no_cv">("all");
    const [poolFilter, setPoolFilter] = useState<"all" | "ACTIVE" | "IN_POOL">("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [newTagInput, setNewTagInput] = useState("");
    const [tagPopoverCandidateId, setTagPopoverCandidateId] = useState<number | null>(null);

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CandidateResponse | null>(null);
    const [cvModalOpen, setCvModalOpen] = useState(false);
    const [cvCandidateId, setCvCandidateId] = useState<number | null>(null);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [applyCandidateId, setApplyCandidateId] = useState<number | undefined>(undefined);

    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

    // Debounce ô tìm kiếm trước khi gọi API; đổi từ khóa thì quay về trang 1
    useEffect(() => {
        const t = setTimeout(() => {
            setKeyword(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleCvFilterChange = (v: "all" | "has_cv" | "no_cv") => {
        setFilterCvStatus(v);
        setPage(1);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const hasCv = filterCvStatus === "all" ? undefined : filterCvStatus === "has_cv";
            const poolStatus = poolFilter === "all" ? undefined : poolFilter;
            const [candRes, appRes] = await Promise.all([
                getCandidates({ keyword: keyword || undefined, hasCv, poolStatus, page: page - 1, size: pageSize }),
                getApplications(),          // lấy tất cả đơn ứng tuyển (không phân trang) để gộp vào từng ứng viên
            ]);
            setCandidates(candRes.data.content);
            setTotalCandidates(candRes.data.totalItems);
            setApplications(appRes.data.content);
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
    }, [notification, keyword, filterCvStatus, poolFilter, page, pageSize]);

    useEffect(() => { loadData(); }, [loadData]);

    // Đếm ứng viên có/chưa có CV trên toàn bộ kết quả khớp từ khóa (độc lập với lựa chọn filter CV hiện tại)
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getCandidates({ keyword: keyword || undefined, hasCv: true, page: 0, size: 1 }),
            getCandidates({ keyword: keyword || undefined, hasCv: false, page: 0, size: 1 }),
        ]).then(([withCvRes, withoutCvRes]) => {
            if (cancelled) return;
            setCvBreakdown({ withCv: withCvRes.data.totalItems, withoutCv: withoutCvRes.data.totalItems });
        }).catch(() => { /* không chặn trang chính nếu lỗi */ });
        return () => { cancelled = true; };
    }, [keyword]);

    // Gộp ứng viên (trang hiện tại) + danh sách vị trí đã ứng tuyển
    const candidatesWithApps: CandidateWithApplications[] = useMemo(() => {
        const appByCandidate = applications.reduce<Record<number, ApplicationResponse[]>>((acc, app) => {
            (acc[app.candidateId] ??= []).push(app);
            return acc;
        }, {});

        return candidates.map((c) => ({
            ...c,
            applications: appByCandidate[c.id] ?? [],
        }));
    }, [candidates, applications]);

    const handleBulkDelete = () => {
        modal.confirm({
            title: `Xóa ${selectedRowKeys.length} ứng viên đã chọn?`,
            content: "Hành động này không thể hoàn tác. Ứng viên đã có hồ sơ đang xử lý vẫn có thể bị lỗi khi xóa.",
            okText: "Xóa",
            okButtonProps: { danger: true },
            onOk: async () => {
                const res = await bulkDeleteCandidates(selectedRowKeys as number[]);
                const failedCount = Object.keys(res.data.failedIds).length;
                if (failedCount === 0) {
                    message.success(`Đã xóa ${res.data.succeededIds.length} ứng viên`);
                } else {
                    message.warning(
                        `Đã xóa ${res.data.succeededIds.length} ứng viên, ${failedCount} ứng viên không thể xóa`
                    );
                    console.warn("Bulk delete failures:", res.data.failedIds);
                }
                setSelectedRowKeys([]);
                loadData();
            },
        });
    };

    const handleExportExcel = () => {
        exportToExcel(
            "ung-vien",
            [
                { header: "Họ tên", value: (c: CandidateWithApplications) => c.fullName },
                { header: "Email", value: (c: CandidateWithApplications) => c.email },
                { header: "Điện thoại", value: (c: CandidateWithApplications) => c.phone },
                { header: "Học vấn", value: (c: CandidateWithApplications) => c.educationLevelName },
                { header: "Kỹ năng", value: (c: CandidateWithApplications) => c.skillNames?.join(", ") },
                { header: "Vị trí ứng tuyển", value: (c: CandidateWithApplications) => c.applications.map((a) => a.jobTitle).join(", ") },
                { header: "Có CV", value: (c: CandidateWithApplications) => c.cvFileUrl ? "Có" : "Chưa có" },
            ],
            candidatesWithApps,
        );
    };

    const handleAddTag = async (candidateId: number) => {
        if (!newTagInput.trim()) return;
        try {
            await addCandidateTag(candidateId, newTagInput.trim());
            setNewTagInput("");
            setTagPopoverCandidateId(null);
            loadData();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không thêm được tag");
        }
    };

    const handleRemoveTag = async (candidateId: number, tagId: number) => {
        try {
            await removeCandidateTag(candidateId, tagId);
            loadData();
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không xóa được tag");
        }
    };

    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

    const columns: ColumnsType<CandidateWithApplications> = [
        {
            title: "Ứng viên",
            key: "candidate",
            width: 220,
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
                    <div>
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
            title: "Vị trí ứng tuyển",
            key: "applications",
            width: 280,
            render: (_, record) => {
                if (!record.applications.length) {
                    return <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Chưa ứng tuyển</span>;
                }
                return (
                    <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                        {record.applications.map((app) => (
                            <div key={app.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <Tag color="geekblue" style={{ borderRadius: 6, margin: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {app.jobTitle || `Job #${app.jobPostingId}`}
                                </Tag>
                                <Tag
                                    color={
                                        app.currentStageType === "REJECTED" ? "red" :
                                            app.currentStageType === "HIRED" ? "green" : "processing"
                                    }
                                    style={{ borderRadius: 6, margin: 0, fontSize: 11 }}
                                >
                                    {app.currentStageName}
                                </Tag>
                            </div>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: "Học vấn",
            dataIndex: "educationLevelName",
            key: "educationLevelName",
            width: 120,
            render: (v) => v
                ? <Tag style={{ borderRadius: 6 }}>{v}</Tag>
                : <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Kỹ năng",
            dataIndex: "skillNames",
            key: "skillNames",
            width: 180,
            render: (names: string[]) => (
                <Space wrap size={4}>
                    {names?.slice(0, 3).map((n) => (
                        <Tag key={n} color="blue" style={{ borderRadius: 6, fontSize: 11 }}>{n}</Tag>
                    ))}
                    {names?.length > 3 && (
                        <Tooltip title={names.slice(3).join(", ")}>
                            <Tag style={{ borderRadius: 6, fontSize: 11, cursor: "pointer" }}>+{names.length - 3}</Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: "Talent Pool",
            key: "pool",
            width: 200,
            render: (_, record) => (
                <Space orientation="vertical" size={4}>
                    {record.poolStatus === "IN_POOL" && (
                        <Tag color="gold" style={{ borderRadius: 6, margin: 0 }}>Trong Pool</Tag>
                    )}
                    <Space wrap size={4}>
                        {record.tags.map((t) => (
                            <Tag
                                key={t.id}
                                style={{ borderRadius: 6, margin: 0, fontSize: 11 }}
                                closeIcon={<CloseOutlined style={{ fontSize: 9 }} />}
                                onClose={(e) => { e.preventDefault(); handleRemoveTag(record.id, t.id); }}
                            >
                                {t.tag}
                            </Tag>
                        ))}
                        <Popover
                            open={tagPopoverCandidateId === record.id}
                            onOpenChange={(open) => { setTagPopoverCandidateId(open ? record.id : null); setNewTagInput(""); }}
                            trigger="click"
                            content={
                                <Space>
                                    <Input
                                        size="small"
                                        placeholder="Tên tag"
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onPressEnter={() => handleAddTag(record.id)}
                                    />
                                    <Button size="small" type="primary" onClick={() => handleAddTag(record.id)}>
                                        Thêm
                                    </Button>
                                </Space>
                            }
                        >
                            <Tag style={{ borderRadius: 6, margin: 0, fontSize: 11, cursor: "pointer" }} icon={<TagOutlined />}>
                                + Tag
                            </Tag>
                        </Popover>
                    </Space>
                </Space>
            ),
        },
        {
            title: "CV",
            dataIndex: "cvFileUrl",
            key: "cvFileUrl",
            width: 100,
            render: (url: string | null) =>
                url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.primary, fontWeight: 500 }}>
                        <FilePdfOutlined /> Xem
                    </a>
                ) : (
                    <span style={{ color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <FileUnknownOutlined /> Chưa có
                    </span>
                ),
        },
        {
            title: "Thao tác",
            key: "actions",
            fixed: "right",
            width: 180,
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Chỉnh sửa">
                        <Button type="default" size="small" icon={<UserOutlined />}
                            onClick={() => { setEditingItem(record); setFormModalOpen(true); }}>
                            Sửa
                        </Button>
                    </Tooltip>
                    <Tooltip title="Upload CV">
                        <Button type="default" size="small" icon={<UploadOutlined />}
                            onClick={() => { setCvCandidateId(record.id); setCvModalOpen(true); }}>
                            CV
                        </Button>
                    </Tooltip>
                    <Tooltip title="Tạo đơn ứng tuyển">
                        <Button type="primary" size="small" icon={<SendOutlined />}
                            onClick={() => { setApplyCandidateId(record.id); setApplyModalOpen(true); }}>
                            Ứng tuyển
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className="page-container animate-fade-in">
            {/* Header giữ nguyên */}
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
                        <div className="page-header-subtitle">Talent Pool — kho dữ liệu ứng viên của công ty</div>
                    </div>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} size="large" onClick={handleExportExcel}>
                        Xuất Excel
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} size="large"
                        onClick={() => { setEditingItem(null); setFormModalOpen(true); }}>
                        Thêm ứng viên
                    </Button>
                </Space>
            </div>

            {/* Summary cards giữ nguyên */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {[
                    { label: "Tổng ứng viên", value: totalCandidates, color: COLORS.primary, bg: "#F0FDF4" },
                    { label: "Đã có CV", value: cvBreakdown.withCv, color: "#3B82F6", bg: "#EFF6FF" },
                    { label: "Chưa có CV", value: cvBreakdown.withoutCv, color: "#F59E0B", bg: "#FFFBEB" },
                ].map((s) => (
                    <Col xs={8} key={s.label}>
                        <Card style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 12 }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{s.label}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ border: "none" }}>
                <div style={{ marginBottom: 16 }}>
                    <Segmented
                        value={poolFilter}
                        onChange={(v) => { setPoolFilter(v as "all" | "ACTIVE" | "IN_POOL"); setPage(1); }}
                        options={[
                            { label: "Tất cả ứng viên", value: "all" },
                            { label: "Đang hoạt động", value: "ACTIVE" },
                            { label: "Talent Pool", value: "IN_POOL" },
                        ]}
                    />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                        placeholder="Tìm theo tên, email, kỹ năng, vị trí..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                    <Select
                        value={filterCvStatus}
                        onChange={handleCvFilterChange}
                        style={{ width: 160 }}
                        options={[
                            { value: "all", label: "Tất cả CV" },
                            { value: "has_cv", label: "Đã có CV" },
                            { value: "no_cv", label: "Chưa có CV" },
                        ]}
                    />
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
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
                            Xóa hàng loạt
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
                    dataSource={candidatesWithApps}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
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
                    scroll={{ x: 1000 }}
                    rowHoverable
                />
            </Card>

            <CandidateFormModal open={formModalOpen} editingItem={editingItem}
                onClose={() => setFormModalOpen(false)} onSuccess={loadData} />
            <CvUploadModal open={cvModalOpen} candidateId={cvCandidateId}
                onClose={() => setCvModalOpen(false)} onSuccess={loadData} />
            <ApplicationCreateModal open={applyModalOpen} presetCandidateId={applyCandidateId}
                onClose={() => setApplyModalOpen(false)} onSuccess={loadData} />
        </div>
    );
}