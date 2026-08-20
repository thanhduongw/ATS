import { useCallback, useEffect, useState } from "react";
import { App, Table, Tag, Button, Segmented, Card, Row, Col, Avatar, Space, Input, DatePicker } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse, OfferStatus } from "../types";
import OfferDetailDrawer from "./OfferDetailDrawer";
import OfferCreateModal from "./OfferCreateModal";
import { COLORS } from "../../../app/theme";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import SavedFiltersBar from "../../../components/ui/SavedFiltersBar";

const { RangePicker } = DatePicker;

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

interface Filters {
    keyword: string;
    dateRange: [string, string] | null;
}

const EMPTY_FILTERS: Filters = { keyword: "", dateRange: null };

export default function OffersList() {
    const { notification } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    const isHr = !!role && HR_ROLES.includes(role);
    const isDept = !!role && DEPARTMENT_ROLES.includes(role);

    const [offers, setOffers] = useState<OfferResponse[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => ({ ...f, keyword: searchInput.trim() }));
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const loadOffers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOffers({
                status: filterStatus === "ALL" ? undefined : (filterStatus as OfferStatus),
                createdFrom: filters.dateRange?.[0],
                createdTo: filters.dateRange?.[1],
                page: page - 1,
                size: pageSize,
            });
            setOffers(res.data.content);
            setTotalItems(res.data.totalItems);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            notification.error({
                message: "Không tải được danh sách offer",
                description: axiosErr.response?.data?.message ?? "Vui lòng thử lại",
            });
        } finally {
            setLoading(false);
        }
    }, [notification, filterStatus, filters, page, pageSize]);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    // Đơn giản: lọc theo từ khóa tên ứng viên trên trang hiện tại (server chưa hỗ trợ full-text theo tên offer)
    const displayed = filters.keyword
        ? offers.filter((o) => o.candidateName?.toLowerCase().includes(filters.keyword.toLowerCase()))
        : offers;

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
                    onChange={(v) => { setFilterStatus(v as string); setPage(1); }}
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

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <Input
                    prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                    placeholder="Tìm theo tên ứng viên..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                />
                <RangePicker
                    placeholder={["Tạo từ ngày", "Đến ngày"]}
                    onChange={(v) => {
                        const range = v as [Dayjs, Dayjs] | null;
                        setFilters((f) => ({
                            ...f,
                            dateRange: range ? [range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")] : null,
                        }));
                        setPage(1);
                    }}
                />
                <SavedFiltersBar<Filters>
                    storageKey="ats.savedFilters.offers"
                    currentFilters={filters}
                    onApply={(f) => { setFilters(f); setSearchInput(f.keyword); setPage(1); }}
                />
            </div>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={displayed}
                pagination={{
                    current: page,
                    pageSize,
                    total: totalItems,
                    size: "small",
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    showTotal: (total) => `Tổng ${total} offer`,
                    onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                }}
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
