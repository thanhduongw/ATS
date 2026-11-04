import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Select} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { getOffers } from "../offerApi";
import { getPostings } from "../../recruitment/recruitmentApi";
import type { JobPostingResponse } from "../../recruitment/types";
import type { OfferResponse, OfferStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS } from "../../../app/theme";
import { OFFER_STATUS, statusMeta } from "../../../app/statusLabels";
import { formatMoney } from "../../../app/money";
import { shortDate } from "../../../app/datetime";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { attentionRowStyle, rowArrowColumn } from "../../../components/ui/listHelpers";
import { Avatar, Panel } from "../../../components/ui/designKit";
import FitTable from "../../../components/ui/FitTable";
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
    const [postings, setPostings] = useState<JobPostingResponse[]>([]);

    useEffect(() => {
        getOffers({ size: 1000 })
            .then((r) => setOffers(r.data.content))
            .catch(() => { setFailed(true); message.error("Không tải được danh sách thư mời"); })
            .finally(() => setLoading(false));
        getPostings({ size: 1000 }).then((r) => setPostings(r.data.content)).catch(() => undefined);
    }, [message]);

    const jobs = useMemo(() => [...new Set(offers.map((o) => o.jobTitle).filter(Boolean) as string[])], [offers]);
    // R45: bộ chọn việc làm nhóm theo phòng ban, kèm số thư mời của từng việc.
    const jobOptions = useMemo(() => {
        const groups = new Map<string, { value: string; label: string }[]>();
        jobs.forEach((j) => {
            const dept = postings.find((p) => p.title === j)?.departmentName ?? "Khác";
            const n = offers.filter((o) => o.jobTitle === j).length;
            groups.set(dept, [...(groups.get(dept) ?? []), { value: j, label: `${j} · ${n} thư mời` }]);
        });
        return [...groups.entries()].map(([label, options]) => ({ label: label.toUpperCase(), options }));
    }, [jobs, postings, offers]);
    const jobPosting = job ? postings.find((p) => p.title === job) : undefined;
    const jobOffers = job ? offers.filter((o) => o.jobTitle === job) : [];
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
                        showSearch
                        placeholder="Tìm việc làm"
                        value={job}
                        onChange={setJob}
                        style={{ width: 320, maxWidth: "100%" }}
                        popupMatchSelectWidth={false}
                        options={jobOptions}
                    />
                </ListFilters>
            }
            footnote={failed ? undefined : job ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    Đang lọc: <b style={{ color: COLORS.textPrimary }}>Việc làm: {job}</b>
                    <a onClick={() => setJob(undefined)}>Xoá lọc</a> · {rows.length} thư mời
                </span>
            ) : `${rows.length} thư mời`}
        >
            {job && !isHm && (
                <Panel style={{ borderRadius: 0, boxShadow: `inset 0 -1px 0 ${COLORS.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 2 }}>
                            <b style={{ fontSize: 15 }}>{job}</b>
                            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                Tuyển {jobPosting?.headcount ?? "?"} · đã nhận {jobOffers.filter((o) => o.status === "ACCEPTED").length}
                                {" "}· đã gửi {jobOffers.filter((o) => o.status === "APPROVED").length}
                                {" "}· bản nháp {jobOffers.filter((o) => o.status === "DRAFT").length}
                            </span>
                        </div>
                        {jobPosting?.headcount != null && (
                            <span style={{ fontSize: 18, fontWeight: 700 }}>
                                {jobOffers.filter((o) => o.status === "ACCEPTED").length}/{jobPosting.headcount}
                                <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textSecondary }}> suất</span>
                            </span>
                        )}
                        {jobPosting && <Button onClick={() => navigate(`/recruitment/postings/${jobPosting.id}`)}>Mở so sánh ứng viên</Button>}
                    </div>
                </Panel>
            )}
            <FitTable<OfferResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
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
