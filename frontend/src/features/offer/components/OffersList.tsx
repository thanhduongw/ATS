import { useCallback, useEffect, useState } from "react";
import { App, Table, Tag, Button, Segmented, Card, Row, Col, Avatar, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse } from "../types";
import OfferDetailDrawer from "./OfferDetailDrawer";
import OfferCreateModal from "./OfferCreateModal";
import { COLORS } from "../../../app/theme";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";

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

function getInitials(name: string) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export default function OffersList() {
    const { notification } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);
    const isDept = !!role && DEPARTMENT_ROLES.includes(role);

    const [offers, setOffers] = useState<OfferResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const loadOffers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOffers();
            setOffers(res.data);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            notification.error({
                message: "Không tải được danh sách offer",
                description: axiosErr.response?.data?.message ?? "Vui lòng thử lại",
            });
        } finally {
            setLoading(false);
        }
    }, [notification]);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const displayed =
        filterStatus === "ALL"
            ? offers
            : offers.filter((o) => o.status === filterStatus);

    const counts = {
        draft: offers.filter((o) => o.status === "DRAFT").length,
        pending: offers.filter((o) => o.status === "PENDING_APPROVAL").length,
        approved: offers.filter((o) => o.status === "APPROVED").length,
        accepted: offers.filter((o) => o.status === "ACCEPTED").length,
    };

    const columns: ColumnsType<OfferResponse> = [
        {
            title: "Ứng viên",
            dataIndex: "candidateName",
            key: "candidateName",
            render: (name: string) => (
                <Space>
                    <Avatar size="small" style={{ background: COLORS.primary }}>
                        {getInitials(name || "?")}
                    </Avatar>
                    {name}
                </Space>
            ),
        },
        {
            title: "Mức lương",
            dataIndex: "salaryOffered",
            key: "salaryOffered",
            render: (v: number) =>
                v != null ? `${Number(v).toLocaleString("vi-VN")} đ` : "—",
        },
        {
            title: "Loại HĐ",
            dataIndex: "contractTypeName",
            key: "contractTypeName",
        },
        {
            title: "Ngày bắt đầu",
            dataIndex: "startDate",
            key: "startDate",
            render: (d: string) => (d ? dayjs(d).format("DD/MM/YYYY") : "—"),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (s: string) => (
                <Tag color={STATUS_COLOR[s] ?? "default"}>{STATUS_LABEL[s] ?? s}</Tag>
            ),
        },
        {
            title: "Người duyệt",
            dataIndex: "approverName",
            key: "approverName",
        },
        {
            title: "",
            key: "action",
            render: (_: unknown, record: OfferResponse) => (
                <Button
                    type="link"
                    onClick={() => {
                        setSelectedOffer(record);
                        setDrawerOpen(true);
                    }}
                >
                    Chi tiết
                </Button>
            ),
        },
    ];

    return (
        <>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: "Bản nháp", value: counts.draft, color: "#6B7280" },
                    { label: "Chờ duyệt", value: counts.pending, color: "#F59E0B" },
                    { label: "Đã duyệt", value: counts.approved, color: "#3B82F6" },
                    { label: "Ứng viên đã nhận", value: counts.accepted, color: "#22C55E" },
                ].map((s) => (
                    <Col xs={12} sm={6} key={s.label}>
                        <Card
                            size="small"
                            style={{
                                borderRadius: 12,
                                border: `1px solid ${s.color}25`,
                                background: `${s.color}08`,
                            }}
                        >
                            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                {s.label}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <Segmented
                    value={filterStatus}
                    onChange={(v) => setFilterStatus(v as string)}
                    options={Object.entries(STATUS_LABEL).map(([k, label]) => ({
                        label,
                        value: k,
                    }))}
                />

                {/* Chỉ HR được tạo Offer */}
                {isHr && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateOpen(true)}
                    >
                        Tạo Offer
                    </Button>
                )}
                {isDept && !isHr && (
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        Bạn chỉ duyệt Offer được gán cho mình
                    </span>
                )}
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

            {isHr && (
                <OfferCreateModal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onSuccess={() => {
                        setCreateOpen(false);
                        loadOffers();
                    }}
                />
            )}
        </>
    );
}