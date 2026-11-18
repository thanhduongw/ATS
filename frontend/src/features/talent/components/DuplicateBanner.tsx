import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button } from "antd";
import { confirmDuplicate, dismissDuplicate, listDuplicates } from "../duplicateApi";
import { SignalTags } from "../duplicateUi";
import type { DuplicatePair } from "../types";

/**
 * Cảnh báo ở trang chi tiết hồ sơ: ứng viên này có thể trùng với ứng viên khác (cùng file CV, email, SĐT...).
 * Chỉ HR. Hệ thống chỉ gắn cờ — HR bấm "Không phải trùng" hoặc "Đúng là trùng"; không tự gộp hồ sơ.
 * Lỗi khi tải bị bỏ qua lặng lẽ: đây là thông tin phụ, không được làm hỏng trang chi tiết.
 */
export default function DuplicateBanner({ candidateId, enabled }: { candidateId: number; enabled: boolean }) {
    const { message } = App.useApp();
    const [pairs, setPairs] = useState<DuplicatePair[]>([]);
    const [busy, setBusy] = useState<number | null>(null);

    const load = useCallback(() => {
        if (!enabled) return;
        listDuplicates({ candidateId }).then((r) => setPairs(r.data.items)).catch(() => setPairs([]));
    }, [candidateId, enabled]);

    useEffect(() => { load(); }, [load]);

    const review = async (p: DuplicatePair, action: "dismiss" | "confirm") => {
        setBusy(p.id);
        try {
            await (action === "dismiss" ? dismissDuplicate(p.id) : confirmDuplicate(p.id));
            setPairs((cur) => cur.filter((x) => x.id !== p.id));
            message.success(action === "dismiss" ? "Đã bỏ qua cảnh báo trùng" : "Đã ghi nhận là trùng. Hãy xử lý hồ sơ trùng thủ công.");
        } catch {
            message.error("Không cập nhật được, vui lòng thử lại");
        } finally { setBusy(null); }
    };

    if (!enabled || pairs.length === 0) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pairs.map((p) => {
                const other = p.a.candidateId === candidateId ? p.b : p.a;
                return (
                    <Alert
                        key={p.id}
                        type={p.highConfidence ? "error" : "warning"}
                        showIcon
                        message={
                            <span>
                                {p.highConfidence ? "Rất có thể trùng" : "Có thể trùng"} với ứng viên{" "}
                                <b>{other.fullName ?? `#${other.candidateId}`}</b>
                                {(other.email || other.phone) && (
                                    <span style={{ fontWeight: 400 }}> ({[other.email, other.phone].filter(Boolean).join(" · ")})</span>
                                )}
                            </span>
                        }
                        description={<SignalTags signals={p.signals} />}
                        action={
                            <span style={{ display: "inline-flex", gap: 8 }}>
                                <Button size="small" loading={busy === p.id} onClick={() => review(p, "dismiss")}>Không phải trùng</Button>
                                <Button size="small" danger loading={busy === p.id} onClick={() => review(p, "confirm")}>Đúng là trùng</Button>
                            </span>
                        }
                    />
                );
            })}
        </div>
    );
}
