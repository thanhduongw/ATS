import { useEffect, useState } from "react";
import { Card, Table, Select, DatePicker, Button, Typography, Tag } from "antd";
import type { Dayjs } from "dayjs";
import { searchAuditLogs } from "../auditLogApi";
import { getUsers } from "../../auth/authApi";
import type { UserSummaryResponse } from "../../auth/types";
import type { AuditLogResponse } from "../types";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const RESOURCE_TYPES = ["REQUISITION", "JOB_POSTING", "APPLICATION", "OFFER", "CANDIDATE", "USER", "INTERVIEW"];

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogResponse[]>([]);
    const [users, setUsers] = useState<UserSummaryResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const [resourceType, setResourceType] = useState<string | undefined>(undefined);
    const [actorUserId, setActorUserId] = useState<number | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await searchAuditLogs({
                resourceType,
                actorUserId,
                from: dateRange ? dateRange[0].startOf("day").toISOString() : undefined,
                to: dateRange ? dateRange[1].endOf("day").toISOString() : undefined,
            });
            setLogs(res.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsers().then((res) => setUsers(res.data));
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        {
            title: "Thời gian",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string) => new Date(v).toLocaleString("vi-VN"),
        },
        { title: "Người thực hiện", dataIndex: "actorName", key: "actorName" },
        { title: "Hành động", dataIndex: "action", key: "action", render: (v: string) => <Tag>{v}</Tag> },
        { title: "Đối tượng", dataIndex: "resourceType", key: "resourceType" },
        { title: "ID đối tượng", dataIndex: "resourceId", key: "resourceId" },
        { title: "Chi tiết", dataIndex: "metadata", key: "metadata" },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <Title level={3}>Nhật ký hệ thống</Title>

                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <Select
                        allowClear
                        placeholder="Loại đối tượng"
                        style={{ width: 200 }}
                        value={resourceType}
                        onChange={setResourceType}
                        options={RESOURCE_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                    <Select
                        allowClear
                        placeholder="Người thực hiện"
                        style={{ width: 220 }}
                        value={actorUserId}
                        onChange={setActorUserId}
                        options={users.map((u) => ({ value: u.id, label: u.fullName }))}
                    />
                    <RangePicker value={dateRange} onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)} />
                    <Button type="primary" onClick={loadLogs}>
                        Lọc
                    </Button>
                </div>

                <Table rowKey="id" loading={loading} columns={columns} dataSource={logs} pagination={{ pageSize: 15 }} />
            </Card>
        </div>
    );
}