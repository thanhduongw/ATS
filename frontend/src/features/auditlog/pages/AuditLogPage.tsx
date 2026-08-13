import { useEffect, useMemo, useState } from "react";
import {
    Card,
    Table,
    Select,
    DatePicker,
    Button,
    Typography,
    Tag,
    Space,
    Tooltip,
    Input,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { searchAuditLogs } from "../auditLogApi";
import { getUsers } from "../../auth/authApi";
import type { UserSummaryResponse } from "../../auth/types";
import type { AuditLogResponse } from "../types";
import {
    AUDIT_ACTION_COLOR,
    AUDIT_ACTION_LABEL,
    RESOURCE_TYPE_LABEL,
} from "../../../app/statusLabels";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const RESOURCE_TYPES = [
    "REQUISITION",
    "JOB_POSTING",
    "APPLICATION",
    "OFFER",
    "CANDIDATE",
    "USER",
    "INTERVIEW",
];

function resolveAuditPath(
    resourceType: string | null,
    resourceId: number | null
): string | null {
    if (!resourceType || resourceId == null) return null;
    const t = resourceType.toUpperCase();
    switch (t) {
        case "REQUISITION":
            return `/recruitment?tab=requisition&highlightId=${resourceId}`;
        case "JOB_POSTING":
            return `/recruitment?tab=posting&highlightId=${resourceId}`;
        case "APPLICATION":
            return `/applications?highlightId=${resourceId}`;
        case "INTERVIEW":
            return `/interviews?highlightId=${resourceId}`;
        case "OFFER":
            return `/offers?highlightId=${resourceId}`;
        case "CANDIDATE":
            return `/candidates?highlightId=${resourceId}`;
        default:
            return null;
    }
}

export default function AuditLogPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AuditLogResponse[]>([]);
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const [resourceType, setResourceType] = useState<string | undefined>();
    const [actorUserId, setActorUserId] = useState<number | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [keyword, setKeyword] = useState("");

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await searchAuditLogs({
                resourceType,
                actorUserId,
                from: dateRange ? dateRange[0].startOf("day").toISOString() : undefined,
                to: dateRange ? dateRange[1].endOf("day").toISOString() : undefined,
            });
            setLogs(res.data ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsers().then((res) => setUsers(res.data ?? []));
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter((l) => {
            const blob = [
                l.action,
                l.actorName,
                l.resourceType,
                l.metadata,
                String(l.resourceId ?? ""),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return blob.includes(q);
        });
    }, [logs, keyword]);

    const columns: ColumnsType<AuditLogResponse> = [
        {
            title: "Thời gian",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 170,
            render: (v: string) => new Date(v).toLocaleString("vi-VN"),
        },
        {
            title: "Người thực hiện",
            dataIndex: "actorName",
            key: "actorName",
            width: 160,
            render: (v: string) => v || "—",
        },
        {
            title: "Hành động",
            dataIndex: "action",
            key: "action",
            width: 200,
            render: (v: string) => (
                <Tag color={AUDIT_ACTION_COLOR[v] ?? "default"}>
                    {AUDIT_ACTION_LABEL[v] ?? v}
                </Tag>
            ),
        },
        {
            title: "Đối tượng",
            dataIndex: "resourceType",
            key: "resourceType",
            width: 150,
            render: (v: string | null) =>
                v ? RESOURCE_TYPE_LABEL[v] ?? v : "—",
        },
        {
            title: "ID",
            dataIndex: "resourceId",
            key: "resourceId",
            width: 90,
            render: (id: number | null, row) => {
                if (id == null) return "—";
                const path = resolveAuditPath(row.resourceType, id);
                if (!path) return id;
                return (
                    <Button
                        type="link"
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() => navigate(path)}
                    >
                        #{id}
                    </Button>
                );
            },
        },
        {
            title: "Chi tiết",
            dataIndex: "metadata",
            key: "metadata",
            ellipsis: true,
            render: (v: string | null) =>
                v ? (
                    <Tooltip title={v}>
                        <Text style={{ maxWidth: 280 }} ellipsis>
                            {v}
                        </Text>
                    </Tooltip>
                ) : (
                    "—"
                ),
        },
    ];

    return (
        <div className="page-container">
            <Card style={{ border: "none" }}>
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
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            Nhật ký hệ thống
                        </Title>
                        <Text type="secondary">
                            Theo dõi thao tác quan trọng trên toàn tenant
                        </Text>
                    </div>
                </div>

                <Space wrap style={{ marginBottom: 16 }}>
                    <Select
                        allowClear
                        placeholder="Loại đối tượng"
                        style={{ width: 200 }}
                        value={resourceType}
                        onChange={setResourceType}
                        options={RESOURCE_TYPES.map((t) => ({
                            value: t,
                            label: RESOURCE_TYPE_LABEL[t] ?? t,
                        }))}
                    />
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Người thực hiện"
                        style={{ width: 220 }}
                        value={actorUserId}
                        onChange={setActorUserId}
                        options={users.map((u) => ({
                            value: u.id,
                            label: u.fullName || u.email || String(u.id),
                        }))}
                    />
                    <RangePicker
                        value={dateRange}
                        onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
                    />
                    <Input.Search
                        allowClear
                        placeholder="Tìm trong chi tiết..."
                        style={{ width: 220 }}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <Button type="primary" onClick={loadLogs}>
                        Lọc
                    </Button>
                </Space>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={filtered}
                    size="middle"
                    pagination={{ pageSize: 15, showSizeChanger: true }}
                />
            </Card>
        </div>
    );
}