import { useCallback, useEffect, useState } from "react";
import { App, Table, Tag, Button, Segmented, Card, Row, Col, Avatar } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse, OfferStatus } from "../types";
import OfferDetailDrawer from "./OfferDetailDrawer";
import { COLORS, GRADIENTS } from "../../../app/theme";

const STATUS_LABEL: Record<string, string> = {
    ALL: "Tất cả",
    DRAFT: "Bản nháp",
    PENDING_APPROVAL: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối duyệt",
    ACCEPTED: "Ứng viên đã nhận",
    DECLINED: "Ứng viên từ chối",
};

const STATUS_COLOR: Record<string, string> = {
    DRAFT: "default",
    PENDING_APPROVAL: "warning",
    APPROVED: "processing",
    REJECTED: "error",
    ACCEPTED: "success",
    DECLINED: "magenta",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    DRAFT: <FileTextOutlined />,
    PENDING_APPROVAL: <ClockCircleOutlined />,
    APPROVED: <CheckCircleOutlined />,
    REJECTED: <CloseCircleOutlined />,
    ACCEPTED: <CheckCircleOutlined />,
    DECLINED: <CloseCircleOutlined />,
};

function getInitials(name: string) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export default function OffersList() {
    const { notification } = App.useApp();
    const [offers, setOffers] = useState<OfferResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const loadOffers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOffers();
            setOffers(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            console.error(axiosErr.response?.data?.message ?? "Lỗi tải dữ liệu");
            notification.error({
                message: "Không tải được danh sách offer",
                description: axiosErr.response?.data?.message ?? "Vui lòng kiểm tra kết nối và thử lại.",
                placement: "topRight",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOffers(); }, [loadOffers]);

    const displayed = offers.filter((o) => filterStatus === "ALL" || o.status === filterStatus);

    /* Summary counts */
    const counts = {
        total: offers.length,
        pending: offers.filter(o => o.status === "PENDING_APPROVAL").length,
        approved: offers.filter(o => o.status === "APPROVED").length,
        accepted: offers.filter(o => o.status === "ACCEPTED").length,
    };

    const columns: ColumnsType<OfferResponse> = [
        {
            title: "Ứng viên",
            key: "candidate",
            render: (_, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar size={36} style={{ background: GRADIENTS.primary, color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                        {getInitials(record.candidateName)}
                    </Avatar>
                    <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{record.candidateName}</span>
                </div>
            ),
        },
        {
            title: "Mức lương đề nghị",
            dataIndex: "salaryOffered",
            key: "salaryOffered",
            render: (val: number) => (
                <span style={{ fontWeight: 600, color: COLORS.primary }}>
                    {val.toLocaleString("vi-VN")} VND
                </span>
            ),
        },
        { title: "Loại hợp đồng", dataIndex: "contractTypeName", key: "contractTypeName" },
        {
            title: "Ngày bắt đầu",
            dataIndex: "startDate",
            key: "startDate",
            render: (val: string) => dayjs(val).format("DD/MM/YYYY"),
        },
        { title: "Người duyệt", dataIndex: "approverName", key: "approverName",
            render: (v) => v || <span style={{ color: COLORS.textMuted }}>—</span>,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: OfferStatus) => (
                <Tag color={STATUS_COLOR[status]} icon={STATUS_ICON[status]} style={{ fontWeight: 500 }}>
                    {STATUS_LABEL[status] ?? status}
                </Tag>
            ),
        },
        {
            title: "",
            key: "action",
            width: 100,
            render: (_, record) => (
                <Button type="link" onClick={() => { setSelectedOffer(record); setDrawerOpen(true); }}>
                    Chi tiết →
                </Button>
            ),
        },
    ];

    return (
        <>
            {/* Summary cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {[
                    { label: "Tổng Offer", value: counts.total, color: COLORS.primary, bg: "#F0FDF4", icon: <FileTextOutlined /> },
                    { label: "Chờ duyệt", value: counts.pending, color: "#F59E0B", bg: "#FFFBEB", icon: <ClockCircleOutlined /> },
                    { label: "Đã duyệt", value: counts.approved, color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircleOutlined /> },
                    { label: "Ứng viên đã nhận", value: counts.accepted, color: "#22C55E", bg: "#F0FDF4", icon: <CheckCircleOutlined /> },
                ].map((s) => (
                    <Col xs={12} sm={6} key={s.label}>
                        <Card style={{ background: s.bg, border: `1px solid ${s.color}25`, borderRadius: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `${s.color}15`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: s.color, fontSize: 16,
                                }}>
                                    {s.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{s.label}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filter + Table */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <Segmented
                    value={filterStatus}
                    onChange={(v) => setFilterStatus(v as string)}
                    options={Object.entries(STATUS_LABEL).map(([k, label]) => ({ label, value: k }))}
                />
            </div>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={displayed}
                pagination={{ pageSize: 10, size: "small" }}
            />

            <OfferDetailDrawer
                open={drawerOpen}
                offer={selectedOffer}
                onClose={() => setDrawerOpen(false)}
                onChanged={loadOffers}
            />
        </>
    );
}
