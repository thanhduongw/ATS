import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Input, Select, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getPostings, getRequisitions } from "../recruitmentApi";
import { getApplications } from "../../candidate/applicationApi";
import type { JobRequisitionResponse, RequisitionStatus } from "../types";
import { useAppSelector } from "../../../app/hooks";
import { COLORS, type StatusTone } from "../../../app/theme";
import { shortDate } from "../../../app/datetime";
import ListPage, { ListFilters, StatusTabs } from "../../../components/ui/listKit";
import { attentionRowStyle, rowArrowColumn } from "../../../components/ui/listHelpers";
import { Avatar } from "../../../components/ui/designKit";
import StatusTag from "../../../components/ui/StatusTag";
import { requisitionCode, useRecruitmentCatalogs } from "../useRecruitmentCatalogs";

type Tab = RequisitionStatus | "ALL";

/** Sắc độ DS06: Chờ duyệt cam · Yêu cầu sửa tím · Đã duyệt xanh lá · Từ chối đỏ · Bản nháp xám. */
const TONE: Record<RequisitionStatus, StatusTone> = {
    DRAFT: "neutral", PENDING_APPROVAL: "warning", APPROVED: "success", REJECTED: "danger", CHANGES_REQUESTED: "interview",
};

/**
 * R02 (Chuyên viên tuyển dụng) / H04 (Đại diện phòng ban) · MÀN CHÍNH · Yêu cầu tuyển dụng — danh sách.
 * Tab "Đã đóng" của HTML chưa có trạng thái tương ứng ở backend nên không hiện (không vẽ tab chết).
 */
export default function RequisitionListPanel() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const user = useAppSelector((s) => s.auth.user);
    const isHm = user?.role === "HIRING_MANAGER";
    const cat = useRecruitmentCatalogs();
    const [items, setItems] = useState<JobRequisitionResponse[]>([]);
    const [hired, setHired] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<Tab>(isHm ? "CHANGES_REQUESTED" : "PENDING_APPROVAL");
    const [keyword, setKeyword] = useState("");
    const [departmentId, setDepartmentId] = useState<number | undefined>();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [reqs, postings, apps] = await Promise.all([
                getRequisitions({ size: 1000 }),
                isHm ? getPostings({ size: 1000 }) : Promise.resolve(null),
                isHm ? getApplications({ stageType: "HIRED", size: 1000 }) : Promise.resolve(null),
            ]);
            setItems(reqs.data.content);
            if (postings && apps) {
                // H04 cột "Đã tuyển": số hồ sơ Đã tuyển của các việc làm mở từ yêu cầu đó.
                const reqOfPosting = new Map(postings.data.content.map((p) => [p.id, p.requisitionId]));
                const m: Record<number, number> = {};
                apps.data.content.forEach((a) => {
                    const r = reqOfPosting.get(a.jobPostingId);
                    if (r != null) m[r] = (m[r] ?? 0) + 1;
                });
                setHired(m);
            }
            setFailed(false);
        } catch {
            setFailed(true);
            message.error("Không tải được danh sách yêu cầu tuyển dụng");
        } finally {
            setLoading(false);
        }
    }, [isHm, message]);

    useEffect(() => { void load(); }, [load]);

    const label = (s: RequisitionStatus) => ({
        DRAFT: "Bản nháp", PENDING_APPROVAL: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối",
        CHANGES_REQUESTED: isHm ? "Cần sửa" : "Yêu cầu sửa",
    })[s];

    const filtered = useMemo(() => {
        const k = keyword.trim().toLowerCase();
        return items.filter((r) =>
            (!k || r.title.toLowerCase().includes(k) || requisitionCode(r.id).toLowerCase().includes(k))
            && (!departmentId || r.departmentId === departmentId));
    }, [items, keyword, departmentId]);
    const count = (s: RequisitionStatus) => filtered.filter((r) => r.status === s).length;
    const rows = tab === "ALL" ? filtered : filtered.filter((r) => r.status === tab);

    const order: RequisitionStatus[] = isHm
        ? ["CHANGES_REQUESTED", "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]
        : ["PENDING_APPROVAL", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

    const titleCol = {
        title: "Vị trí", key: "title",
        render: (_: unknown, r: JobRequisitionResponse) => (
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600 }}>{r.title}</span>
                <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{requisitionCode(r.id)}</span>
            </div>
        ),
    };
    const statusCol = {
        title: "Trạng thái", key: "status",
        render: (_: unknown, r: JobRequisitionResponse) => <StatusTag label={label(r.status)} tone={TONE[r.status]} />,
    };
    const sentCol = {
        title: "Ngày gửi", key: "sent",
        render: (_: unknown, r: JobRequisitionResponse) => (r.status === "DRAFT" ? "—" : shortDate(r.createdAt)),
    };
    const columns: ColumnsType<JobRequisitionResponse> = isHm ? [
        titleCol,
        { title: "Số lượng", key: "qty", dataIndex: "quantity" },
        statusCol,
        {
            title: "Đã tuyển", key: "hired",
            render: (_, r) => (r.status === "APPROVED" ? `${hired[r.id] ?? 0}/${r.quantity}` : "—"),
        },
        sentCol,
        rowArrowColumn,
    ] : [
        titleCol,
        { title: "Phòng ban", key: "dept", render: (_, r) => cat.departmentMap[r.departmentId] ?? "—" },
        { title: "Số lượng", key: "qty", dataIndex: "quantity" },
        {
            title: "Người yêu cầu", key: "requester",
            render: (_, r) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Avatar name={r.requesterName} colorKey={r.requesterId} size={24} />{r.requesterName}
                </span>
            ),
        },
        statusCol,
        sentCol,
        rowArrowColumn,
    ];

    const myDept = isHm && user?.departmentId != null ? cat.departmentMap[Number(user.departmentId)] : undefined;

    return (
        <ListPage
            title="Yêu cầu tuyển dụng"
            subtitle={myDept ? `Phòng ${myDept}` : undefined}
            actions={isHm ? <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/recruitment/requisitions/new")}>Tạo yêu cầu</Button> : undefined}
            tabs={
                <StatusTabs<Tab>
                    active={tab}
                    onChange={setTab}
                    items={[
                        ...order.map((s) => ({ key: s as Tab, label: label(s), count: count(s) })),
                        { key: "ALL" as Tab, label: "Tất cả", count: filtered.length },
                    ]}
                />
            }
            filters={
                <ListFilters>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo vị trí hoặc mã yêu cầu"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 300 }}
                    />
                    {!isHm && (
                        <Select
                            allowClear
                            placeholder="Phòng ban"
                            value={departmentId}
                            onChange={setDepartmentId}
                            style={{ width: 220 }}
                            options={cat.departments.map((d) => ({ value: d.id, label: String(d.name) }))}
                        />
                    )}
                </ListFilters>
            }
            footnote={failed ? undefined : `${rows.length} yêu cầu`}
        >
            <Table<JobRequisitionResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={rows.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
                rowClassName={() => "row-clickable"}
                onRow={(r) => ({
                    onClick: () => navigate(`/recruitment/requisitions/${r.id}`),
                    // DS06: tím = cần sửa (với người tạo); cam = cần làm (HR duyệt).
                    style: isHm && r.status === "CHANGES_REQUESTED" ? attentionRowStyle("fix")
                        : !isHm && r.status === "PENDING_APPROVAL" ? attentionRowStyle("todo") : undefined,
                })}
                locale={{ emptyText: failed ? "Không tải được dữ liệu. Thử tải lại trang." : "Không có yêu cầu nào" }}
            />
        </ListPage>
    );
}
