import { useCallback, useEffect, useState } from "react";
import { App, Card, Table, Button, Tag, Space, Input, Select, Row, Col, Tooltip, Avatar } from "antd";
import { PlusOutlined, UploadOutlined, SendOutlined, SearchOutlined, UserOutlined, FilePdfOutlined, FileUnknownOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { ColumnsType } from "antd/es/table";
import { getCandidates } from "../candidateApi";
import type { ApiMessageResponse, CandidateResponse } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import CvUploadModal from "../components/CvUploadModal";
import ApplicationCreateModal from "../components/ApplicationCreateModal";
import { COLORS, GRADIENTS } from "../../../app/theme";

export default function CandidatesPage() {
    const { notification } = App.useApp();
    const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [filterCvStatus, setFilterCvStatus] = useState<"all" | "has_cv" | "no_cv">("all");

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CandidateResponse | null>(null);

    const [cvModalOpen, setCvModalOpen] = useState(false);
    const [cvCandidateId, setCvCandidateId] = useState<number | null>(null);

    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [applyCandidateId, setApplyCandidateId] = useState<number | undefined>(undefined);

    const loadCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCandidates();
            setCandidates(res.data);
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
    }, []);

    useEffect(() => { loadCandidates(); }, [loadCandidates]);

    /* ── Filter logic ─────────────────────────────────── */
    const filtered = candidates.filter((c) => {
        const matchText = !searchText ||
            c.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
            c.email.toLowerCase().includes(searchText.toLowerCase()) ||
            (c.skillNames?.some(s => s.toLowerCase().includes(searchText.toLowerCase())));
        const matchCv =
            filterCvStatus === "all" ||
            (filterCvStatus === "has_cv" && !!c.cvFileUrl) ||
            (filterCvStatus === "no_cv" && !c.cvFileUrl);
        return matchText && matchCv;
    });

    /* ── Summary stats ────────────────────────────────── */
    const totalWithCv = candidates.filter(c => !!c.cvFileUrl).length;
    const totalNoCv = candidates.filter(c => !c.cvFileUrl).length;

    /* ── Get initials ─────────────────────────────────── */
    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    /* Avatar gradient colors for variety */
    const AVATAR_COLORS = [GRADIENTS.stat1, GRADIENTS.stat2, GRADIENTS.stat3, GRADIENTS.stat4];

    const columns: ColumnsType<CandidateResponse> = [
        {
            title: "Ứng viên",
            key: "candidate",
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
                    </div>
                </div>
            ),
        },
        {
            title: "Điện thoại",
            dataIndex: "phone",
            key: "phone",
            render: (v) => v || <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Học vấn",
            dataIndex: "educationLevelName",
            key: "educationLevelName",
            render: (v) => v
                ? <Tag style={{ borderRadius: 6 }}>{v}</Tag>
                : <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Kỹ năng",
            dataIndex: "skillNames",
            key: "skillNames",
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
            title: "CV",
            dataIndex: "cvFileUrl",
            key: "cvFileUrl",
            render: (url: string | null) =>
                url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.primary, fontWeight: 500 }}>
                        <FilePdfOutlined />Xem CV
                    </a>
                ) : (
                    <span style={{ color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <FileUnknownOutlined />Chưa có
                    </span>
                ),
        },
        {
            title: "Thao tác",
            key: "actions",
            fixed: "right" as const,
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
            {/* ── Page Header ──────────────────── */}
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
                <Button type="primary" icon={<PlusOutlined />} size="large"
                    onClick={() => { setEditingItem(null); setFormModalOpen(true); }}>
                    Thêm ứng viên
                </Button>
            </div>

            {/* ── Summary Cards ─────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {[
                    { label: "Tổng ứng viên", value: candidates.length, color: COLORS.primary, bg: "#F0FDF4" },
                    { label: "Đã có CV", value: totalWithCv, color: "#3B82F6", bg: "#EFF6FF" },
                    { label: "Chưa có CV", value: totalNoCv, color: "#F59E0B", bg: "#FFFBEB" },
                ].map((s) => (
                    <Col xs={8} key={s.label}>
                        <Card style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 12 }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{s.label}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── Main Table Card ─────────────── */}
            <Card style={{ border: "none" }}>
                {/* Filter bar */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                        placeholder="Tìm theo tên, email, kỹ năng..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 280 }}
                        allowClear
                    />
                    <Select
                        value={filterCvStatus}
                        onChange={setFilterCvStatus}
                        style={{ width: 160 }}
                        options={[
                            { value: "all", label: "Tất cả CV" },
                            { value: "has_cv", label: "Đã có CV" },
                            { value: "no_cv", label: "Chưa có CV" },
                        ]}
                    />
                    <span style={{ fontSize: 13, color: COLORS.textSecondary, alignSelf: "center" }}>
                        Hiển thị {filtered.length} / {candidates.length}
                    </span>
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={filtered}
                    pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
                    scroll={{ x: 800 }}
                    rowHoverable
                />
            </Card>

            {/* ── Modals ────────────────────────── */}
            <CandidateFormModal open={formModalOpen} editingItem={editingItem}
                onClose={() => setFormModalOpen(false)} onSuccess={loadCandidates} />
            <CvUploadModal open={cvModalOpen} candidateId={cvCandidateId}
                onClose={() => setCvModalOpen(false)} onSuccess={loadCandidates} />
            <ApplicationCreateModal open={applyModalOpen} presetCandidateId={applyCandidateId}
                onClose={() => setApplyModalOpen(false)} onSuccess={loadCandidates} />
        </div>
    );
}
