import { useEffect, useMemo, useState } from "react";
import { DatePicker, Input, Select, Tooltip } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { searchAuditLogs } from "../auditLogApi";
import { getUsers } from "../../auth/authApi";
import type { UserSummaryResponse } from "../../auth/types";
import type { AuditLogResponse } from "../types";
import { AUDIT_ACTION_LABEL, RESOURCE_TYPE_LABEL } from "../../../app/statusLabels";
import { COLORS } from "../../../app/theme";
import ListPage, { ListFilters } from "../../../components/ui/listKit";
import FitTable from "../../../components/ui/FitTable";
import { Avatar } from "../../../components/ui/designKit";

/**
 * Nhật ký hệ thống (Quản trị doanh nghiệp, menu riêng theo quyết định C6 = a) — style danh sách DS04.
 * Chỉ hiện loại đối tượng + mã, không mở được hồ sơ: Quản trị doanh nghiệp không xem hồ sơ ứng viên (A07).
 */
const { RangePicker } = DatePicker;

const RESOURCE_TYPES = ["REQUISITION", "JOB_POSTING", "APPLICATION", "OFFER", "CANDIDATE", "USER", "INTERVIEW"];

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogResponse[]>([]);
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [resourceType, setResourceType] = useState<string | undefined>();
    const [actorUserId, setActorUserId] = useState<number | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [keyword, setKeyword] = useState("");

    useEffect(() => {
        getUsers().then((r) => setUsers((r.data ?? []).filter((u) => u.role !== "CANDIDATE"))).catch(() => setUsers([]));
    }, []);

    // Bộ lọc gửi lên server: đổi là tải lại ngay (không cần nút "Lọc").
    useEffect(() => {
        let cancelled = false;
        searchAuditLogs({
            resourceType,
            actorUserId,
            from: dateRange ? dateRange[0].startOf("day").toISOString() : undefined,
            to: dateRange ? dateRange[1].endOf("day").toISOString() : undefined,
        })
            .then((r) => { if (!cancelled) { setLogs(r.data ?? []); setFailed(false); } })
            .catch(() => { if (!cancelled) setFailed(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [resourceType, actorUserId, dateRange]);

    const rows = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        const sorted = [...logs].sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
        if (!q) return sorted;
        return sorted.filter((l) => [AUDIT_ACTION_LABEL[l.action] ?? l.action, l.actorName, l.metadata, String(l.resourceId ?? "")]
            .filter(Boolean).join(" ").toLowerCase().includes(q));
    }, [logs, keyword]);

    const columns: ColumnsType<AuditLogResponse> = [
        {
            title: "Thời gian", dataIndex: "createdAt", width: 160,
            render: (v: string) => <span style={{ color: COLORS.textSecondary, whiteSpace: "nowrap" }}>{dayjs(v).format("DD/MM/YYYY HH:mm")}</span>,
        },
        {
            title: "Người thực hiện", key: "actor", width: 220,
            render: (_, l) => l.actorName ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={l.actorName} colorKey={l.actorUserId} size={26} />{l.actorName}
                </span>
            ) : <span style={{ color: COLORS.textMuted }}>Hệ thống</span>,
        },
        {
            title: "Hành động", dataIndex: "action", width: 220,
            render: (v: string) => <span style={{ fontWeight: 500 }}>{AUDIT_ACTION_LABEL[v] ?? v}</span>,
        },
        {
            title: "Đối tượng", key: "resource", width: 180,
            render: (_, l) => l.resourceType
                ? `${RESOURCE_TYPE_LABEL[l.resourceType] ?? l.resourceType}${l.resourceId != null ? ` #${l.resourceId}` : ""}`
                : "—",
        },
        {
            title: "Chi tiết", dataIndex: "metadata", ellipsis: { showTitle: false },
            render: (v: string | null) => v
                ? <Tooltip title={v}><span style={{ color: COLORS.textSecondary }}>{v}</span></Tooltip>
                : <span style={{ color: COLORS.textMuted }}>—</span>,
        },
    ];

    return (
        <ListPage
            title="Nhật ký hệ thống"
            subtitle="Thao tác quan trọng trong toàn doanh nghiệp"
            filters={
                <ListFilters>
                    <Input
                        allowClear
                        prefix={<SearchOutlined style={{ color: COLORS.textMuted }} />}
                        placeholder="Tìm theo hành động, người, chi tiết"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        placeholder="Loại đối tượng"
                        style={{ width: 180 }}
                        value={resourceType}
                        onChange={(v) => { setLoading(true); setResourceType(v); }}
                        options={RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABEL[t] ?? t }))}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Người thực hiện"
                        style={{ width: 200 }}
                        value={actorUserId}
                        onChange={(v) => { setLoading(true); setActorUserId(v); }}
                        options={users.map((u) => ({ value: u.id, label: u.fullName || u.email }))}
                    />
                    <RangePicker
                        format="DD/MM/YYYY"
                        value={dateRange}
                        onChange={(v) => { setLoading(true); setDateRange(v as [Dayjs, Dayjs] | null); }}
                    />
                </ListFilters>
            }
            footnote={failed ? undefined : `${rows.length} thao tác`}
        >
            <FitTable<AuditLogResponse>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={rows}
                locale={{ emptyText: failed ? "Không tải được dữ liệu. Thử tải lại trang." : "Không có thao tác nào" }}
            />
        </ListPage>
    );
}
