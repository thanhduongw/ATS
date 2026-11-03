import { useEffect, useMemo, useState } from "react";
import { App, Input, Select, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getOffers } from "../offerApi";
import type { OfferResponse, OfferStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";
import { formatMoney } from "../../../app/money";
import { shortDate } from "../../../app/datetime";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { attentionRowStyle, rowArrowColumn } from "../../../components/ui/listHelpers";
import { Avatar } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";

type Tab = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "ENDED" | "ALL";

/** Tab theo R25. Thu hồi (B3) đang hoãn nên "Hết hạn / thu hồi" hiện chỉ có thư hết hạn. */
const TAB_STATUSES: Record<Exclude<Tab, "ALL">, OfferStatus[]> = {
    DRAFT: ["DRAFT"],
    SENT: ["APPROVED"],
    ACCEPTED: ["ACCEPTED"],
    DECLINED: ["DECLINED"],
    ENDED: ["EXPIRED"],
};

/**
 * R25 · MÀN CHÍNH · Thư mời — danh sách (R45: lọc theo việc làm).
 * Đại diện phòng ban dùng tạm màn này làm "Kết quả tuyển dụng" (H16 làm sau): ẩn cột lương —
 * backend cũng không trả lương cho vai trò này (quyết định C7).
 */
export default function OffersPage() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const role = useAppSelector((s) => s.auth.user?.role);
    const isHm = role === "HIRING_MANAGER";
    const [offers, setOffers] = useState<OfferResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<Tab>("DRAFT");
    const [keyword, setKeyword] = useState("");
    const [job, setJob] = useState<string | undefined>();

    useEffect(() => {
        getOffers({ size: 1000 })
            .then((r) => setOffers(r.data.content))
            .catch(() => { setFailed(true); message.error("Không tải được danh sách thư mời"); })
            .finally(() => setLoading(false));
    }, [message]);

    const jobs = useMemo(() => [...new Set(offers.map((o) => o.jobTitle).filter(Boolean) as string[])], [offers]);
    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return offers.filter((o) => (!k || o.candidateName.toLowerCase().includes(k)) && (!job || o.jobTitle === job));
    }, [offers, keyword, job]);
    const count = (t: Exclude<Tab, "ALL">) => filtered.filter((o) => TAB_STATUSES[t].includes(o.status)).length;
    const rows = tab === "ALL" ? filtered : filtered.filter((o) => TAB_STATUSES[tab].includes(o.status));

    // R25 cột "Hạn phản hồi": thư đã gửi hiện "30/10 · còn 3 ngày".
    const deadline = (o: OfferResponse) => {
        if (!o.responseDeadline) return "—";
        const d = shortDate(o.responseDeadline);
        if (o.status !== "APPROVED") return d;
        const days = dayjs(o.responseDeadline).startOf("day").diff(dayjs().startOf("day"), "day");
        return days > 0 ? `${d} · còn ${days} ngày` : days === 0 ? `${d} · hôm nay` : d;
    };

    const columns: ColumnsType<OfferResponse> = [
        {
            title: "Ứng viên",
            key: "candidate",
            render: (_, o) => (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={o.candidateName} colorKey={o.applicationId} size={32} />
                    <span style={{ fontWeight: 600 }}>{o.candidateName}</span>
                </div>
            ),
        },
        { title: "Việc làm", key: "job", render: (_, o) => o.jobTitle ?? "—" },
        ...(isHm ? [] : [{
            title: "Lương gộp",
            key: "salary",
            render: (_: unknown, o: OfferResponse) => (o.salaryOffered != null ? formatMoney(o.salaryOffered) : "—"),
        }]),
        { title: "Trạng thái", key: "status", render: (_, o) => <StatusTag {...statusMeta(OFFER_STATUS, o.status)} /> },
        { title: "Hạn phản hồi", key: "deadline", render: (_, o) => deadline(o) },
        rowArrowColumn,
    ];

    return (
        <ListPage
            title={isHm ? "Kết quả tuyển dụng" : "Thư mời"}
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={[
                        { key: "DRAFT", label: "Bản nháp", count: count("DRAFT") },
                        { key: "SENT", label: "Đã gửi", count: count("SENT") },
                        { key: "ACCEPTED", label: "Ứng viên nhận", count: count("ACCEPTED") },
                        { key: "DECLINED", label: "Ứng viên từ chối", count: count("DECLINED") },
                        { key: "ENDED", label: "Hết hạn / thu hồi", count: count("ENDED") },
                        { key: "ALL", label: "Tất cả", count: filtered.length },
                    ]}
                />
            }
            filters={
                <ListFilters>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo tên ứng viên"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        placeholder="Việc làm"
                        value={job}
                        onChange={setJob}
                        style={{ width: 260 }}
                        options={jobs.map((j) => ({ value: j, label: j }))}
                    />
                </ListFilters>
            }
            footnote={failed ? undefined : `${rows.length} thư mời`}
        >
            <Table<OfferResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                rowClassName={() => "row-clickable"}
                onRow={(o) => ({
                    onClick: () => navigate(`/offers/${o.id}`),
                    // DS06: dòng cần làm tô nền cam nhạt — bản nháp chưa gửi.
                    style: o.status === "DRAFT" ? attentionRowStyle("todo") : undefined,
                })}
                locale={{ emptyText: failed ? "Không tải được dữ liệu. Thử tải lại trang." : "Không có thư mời nào" }}
            />
        </ListPage>
    );
}
