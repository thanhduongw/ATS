import { useEffect, useState } from "react";
import { App, Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { COLORS } from "../../../app/theme";
import EmptyState from "../../../components/ui/EmptyState";
import { Avatar } from "../../../components/ui/designKit";
import { confirmDuplicate, dismissDuplicate, listDuplicates } from "../duplicateApi";
import { SignalTags } from "../duplicateUi";
import type { DuplicatePair, DuplicatePerson } from "../types";

function Person({ p }: { p: DuplicatePerson }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Avatar name={p.fullName} colorKey={p.candidateId} size={32} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.fullName ?? `#${p.candidateId}`}</div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{[p.email, p.phone].filter(Boolean).join(" · ") || "—"}</div>
            </div>
        </div>
    );
}

/** Danh sách cặp ứng viên nghi trùng chờ HR xử lý. Chỉ gắn cờ, không tự gộp hồ sơ. */
export default function DuplicatePairsTable({ onCount }: { onCount?: (n: number) => void }) {
    const { message } = App.useApp();
    const [rows, setRows] = useState<DuplicatePair[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null);

    // Tải một lần khi mở tab (loading khởi tạo là true). Cập nhật sau đó làm trực tiếp trên `rows`.
    useEffect(() => {
        listDuplicates()
            .then((r) => { setRows(r.data.items); onCount?.(r.data.items.length); })
            .catch(() => message.error("Không tải được danh sách ứng viên nghi trùng"))
            .finally(() => setLoading(false));
    }, [message, onCount]);

    const review = async (p: DuplicatePair, action: "dismiss" | "confirm") => {
        setBusy(p.id);
        try {
            await (action === "dismiss" ? dismissDuplicate(p.id) : confirmDuplicate(p.id));
            const next = rows.filter((x) => x.id !== p.id);
            setRows(next);
            onCount?.(next.length);
            message.success(action === "dismiss" ? "Đã bỏ qua cảnh báo" : "Đã ghi nhận là trùng. Hãy xử lý hồ sơ trùng thủ công.");
        } catch {
            message.error("Không cập nhật được, vui lòng thử lại");
        } finally { setBusy(null); }
    };

    const columns: ColumnsType<DuplicatePair> = [
        { title: "Ứng viên", key: "a", render: (_, r) => <Person p={r.a} /> },
        { title: "Có thể trùng với", key: "b", render: (_, r) => <Person p={r.b} /> },
        { title: "Lý do", key: "signals", width: 260, render: (_, r) => <SignalTags signals={r.signals} /> },
        {
            title: "", key: "action", width: 240, align: "right",
            render: (_, r) => (
                <span style={{ display: "inline-flex", gap: 8 }}>
                    <Button size="small" loading={busy === r.id} onClick={() => review(r, "dismiss")}>Không phải trùng</Button>
                    <Button size="small" danger loading={busy === r.id} onClick={() => review(r, "confirm")}>Đúng là trùng</Button>
                </span>
            ),
        },
    ];

    return (
        <Table<DuplicatePair>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            locale={{
                emptyText: loading ? <span /> : (
                    <EmptyState
                        title="Không có ứng viên nghi trùng"
                        description="Hệ thống kiểm tra mỗi khi có CV mới: cùng file, email, số điện thoại, hoặc tên và hồ sơ rất giống."
                    />
                ),
            }}
        />
    );
}
