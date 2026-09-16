import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Table, Tag, Button, Segmented, Avatar, Space, Input, DatePicker } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    PlusOutlined,
    SearchOutlined,
    EyeOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    SendOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import type { AxiosError } from "axios";
import { getOffers } from "../offerApi";
import type { ApiMessageResponse, OfferResponse, OfferStatus } from "../types";
import OfferDetailModal from "./OfferDetailModal";
import OfferCreateModal from "./OfferCreateModal";
import { COLORS } from "../../../app/theme";
import { formatMoney } from "../../../app/money";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";
import { useAppSelector } from "../../../app/hooks";
import { HR_ROLES, DEPARTMENT_ROLES } from "../../../app/roles";
import type { UserRole } from "../../auth/types";
import { useTableScrollY } from "../../../app/useTableScrollY";
import EmptyState from "../../../components/ui/EmptyState";
import StatTile from "../../../components/ui/StatTile";
import { StatRow, PageToolbar, FilterBar, IconAction } from "../../../components/ui/pageKit";
import { listPagination } from "../../../components/ui/listStyles";

const { RangePicker } = DatePicker;

const SEGMENT_OPTIONS = [
    { label: "Tất cả", value: "ALL" },
    ...Object.keys(OFFER_STATUS).map((k) => ({ label: OFFER_STATUS[k].label, value: k })),
];

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
    // Toàn bộ offer (không phân trang) — chỉ để đếm số liệu, độc lập với bộ lọc của bảng
    const [allOffers, setAllOffers] = useState<OfferResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [selectedOffer, setSelectedOffer] = useState<OfferResponse | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { wrapRef, scrollY } = useTableScrollY([loading, offers.length]);

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

    useEffect(() => {
        getOffers({ size: 1000 }).then((r) => setAllOffers(r.data.content)).catch(() => setAllOffers([]));
    }, []);

    // Đơn giản: lọc theo từ khóa tên ứng viên trên trang hiện tại (server chưa hỗ trợ full-text theo tên offer)
    const displayed = filters.keyword
        ? offers.filter((o) => o.candidateName?.toLowerCase().includes(filters.keyword.toLowerCase()))
        : offers;

    const counts = useMemo(
        () => ({
            draft: allOffers.filter((o) => o.status === "DRAFT").length,
            pending: allOffers.filter((o) => o.status === "PENDING_APPROVAL").length,
            approved: allOffers.filter((o) => o.status === "APPROVED").length,
            accepted: allOffers.filter((o) => o.status === "ACCEPTED").length,
        }),
        [allOffers],
    );

    const toggleStatus = (next: string) => {
        setFilterStatus((prev) => (prev === next ? "ALL" : next));
        setPage(1);
    };

    const openDetail = (offer: OfferResponse) => {
        setSelectedOffer(offer);
        setDrawerOpen(true);
    };

    const columns: ColumnsType<OfferResponse> = [
        {
            title: "Ứng viên",
            dataIndex: "candidateName",
            key: "candidateName",
            width: 180,
            ellipsis: true,
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
            width: 150,
            render: (v: number) => formatMoney(v),
        },
        {
            title: "Loại HĐ",
            dataIndex: "contractTypeName",
            key: "contractTypeName",
            width: 120,
            ellipsis: true,
        },
        {
            title: "Ngày bắt đầu",
            dataIndex: "startDate",
            key: "startDate",
            width: 110,
            render: (d: string) => (d ? dayjs(d).format("DD/MM/YYYY") : "—"),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 160,
            render: (s: string) => {
                const meta = statusMeta(OFFER_STATUS, s);
                return <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>;
            },
        },
        {
            title: "Người duyệt",
            dataIndex: "approverName",
            key: "approverName",
            width: 130,
            ellipsis: true,
        },
        {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: OfferResponse) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <IconAction
                        title="Xem chi tiết offer"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    />
                </span>
            ),
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <StatRow>
                <StatTile
                    icon={<FileTextOutlined />}
                    label="Bản nháp"
                    value={counts.draft}
                    accent={COLORS.textMuted}
                    active={filterStatus === "DRAFT"}
                    onClick={() => toggleStatus("DRAFT")}
                />
                <StatTile
                    icon={<ClockCircleOutlined />}
                    label="Chờ duyệt"
                    value={counts.pending}
                    accent="#F59E0B"
                    active={filterStatus === "PENDING_APPROVAL"}
                    onClick={() => toggleStatus("PENDING_APPROVAL")}
                />
                <StatTile
                    icon={<SendOutlined />}
                    label="Đã duyệt và gửi"
                    value={counts.approved}
                    accent="#3B82F6"
                    active={filterStatus === "APPROVED"}
                    onClick={() => toggleStatus("APPROVED")}
                />
                <StatTile
                    icon={<CheckCircleOutlined />}
                    label="Ứng viên đã nhận"
                    value={counts.accepted}
                    accent={COLORS.success}
                    active={filterStatus === "ACCEPTED"}
                    onClick={() => toggleStatus("ACCEPTED")}
                />
            </StatRow>

            <PageToolbar
                left={
                    <Segmented
                        value={filterStatus}
                        onChange={(v) => { setFilterStatus(v as string); setPage(1); }}
                        options={SEGMENT_OPTIONS}
                    />
                }
            />

            <FilterBar
                extra={
                    <>
                        {isDept && !isHr && (
                            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                                Bạn chỉ theo dõi kết quả offer của phòng ban, không tạo và không duyệt offer
                            </span>
                        )}
                        {/* Chỉ HR được tạo Offer */}
                        {isHr && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                                Tạo Offer
                            </Button>
                        )}
                    </>
                }
            >
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
                    format="DD/MM/YYYY"
                    onChange={(v) => {
                        const range = v as [Dayjs, Dayjs] | null;
                        setFilters((f) => ({
                            ...f,
                            dateRange: range ? [range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")] : null,
                        }));
                        setPage(1);
                    }}
                />
            </FilterBar>

            <div ref={wrapRef} className="table-scroll-wrap">
                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={displayed}
                    sticky
                    scroll={{ y: scrollY }}
                    onRow={(record) => ({
                        onClick: () => openDetail(record),
                        style: { cursor: "pointer" },
                    })}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalItems,
                        ...listPagination("offer"),
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    locale={{
                        emptyText: (
                            <EmptyState
                                title="Chưa có offer nào"
                                description="Offer phù hợp với bộ lọc hiện tại sẽ hiển thị ở đây."
                            />
                        ),
                    }}
                />
            </div>

            <OfferDetailModal
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
        </div>
    );
}
