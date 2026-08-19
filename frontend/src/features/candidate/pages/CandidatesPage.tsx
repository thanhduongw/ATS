import { useCallback, useEffect, useState, useMemo } from "react";
import { App, Card, Table, Button, Tag, Space, Input, Select, Row, Col, Tooltip, Avatar } from "antd";
import { PlusOutlined, UploadOutlined, SendOutlined, SearchOutlined, UserOutlined, FilePdfOutlined, FileUnknownOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import type { ColumnsType } from "antd/es/table";
import { getCandidates } from "../candidateApi";
import { getApplications } from "../applicationApi";
import type { ApiMessageResponse, CandidateResponse, ApplicationResponse, CandidateWithApplications } from "../types";
import CandidateFormModal from "../components/CandidateFormModal";
import CvUploadModal from "../components/CvUploadModal";
import ApplicationCreateModal from "../components/ApplicationCreateModal";
import { COLORS, GRADIENTS } from "../../../app/theme";

export default function CandidatesPage() {
    const { notification } = App.useApp();
    const [candidates, setCandidates] = useState<CandidateResponse[]>([]);
    const [applications, setApplications] = useState<ApplicationResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [filterCvStatus, setFilterCvStatus] = useState<"all" | "has_cv" | "no_cv">("all");

    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CandidateResponse | null>(null);
    const [cvModalOpen, setCvModalOpen] = useState(false);
    const [cvCandidateId, setCvCandidateId] = useState<number | null>(null);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [applyCandidateId, setApplyCandidateId] = useState<number | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [candRes, appRes] = await Promise.all([
                getCandidates(),
                getApplications(),          // lấy tất cả đơn ứng tuyển
            ]);
            setCandidates(candRes.data);
            setApplications(appRes.data);
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
    }, [notification]);

    useEffect(() => { loadData(); }, [loadData]);

    // Gộp ứng viên + danh sách vị trí đã ứng tuyển
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

    /* ── Filter ─────────────────────────────────── */
    const filtered = candidatesWithApps.filter((c) => {
        const matchText = !searchText ||
            c.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
            c.email.toLowerCase().includes(searchText.toLowerCase()) ||
            (c.skillNames?.some(s => s.toLowerCase().includes(searchText.toLowerCase()))) ||
            (c.applications.some(a =>
                (a.jobTitle || "").toLowerCase().includes(searchText.toLowerCase()) ||
                a.currentStageName.toLowerCase().includes(searchText.toLowerCase())
            ));

        const matchCv =
            filterCvStatus === "all" ||
            (filterCvStatus === "has_cv" && !!c.cvFileUrl) ||
            (filterCvStatus === "no_cv" && !c.cvFileUrl);

        return matchText && matchCv;
    });

    const totalWithCv = candidates.filter(c => !!c.cvFileUrl).length;
    const totalNoCv = candidates.filter(c => !c.cvFileUrl).length;

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
                <Button type="primary" icon={<PlusOutlined />} size="large"
                    onClick={() => { setEditingItem(null); setFormModalOpen(true); }}>
                    Thêm ứng viên
                </Button>
            </div>

            {/* Summary cards giữ nguyên */}
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

            <Card style={{ border: "none" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                        placeholder="Tìm theo tên, email, kỹ năng, vị trí..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 300 }}
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