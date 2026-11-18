import { useEffect, useState } from "react";
import { getUserDirectory } from "../auth/authApi";
import { getResourceHistory } from "./auditLogApi";
import type { AuditLogResponse } from "./types";

export interface HistoryGroup { type: string; ids: number[] }
export interface HistoryEntry extends AuditLogResponse { who: string | null }

/**
 * 3.11: gom nhật ký của các đối tượng liên quan (vd. hồ sơ + các buổi phỏng vấn + thư mời của nó) thành một dòng
 * thời gian, mới nhất trước. Tên người thực hiện ghép từ danh bạ nội bộ; ai không có trong danh bạ (ứng viên) → null.
 * Lỗi mạng thì trả mảng rỗng: lịch sử là phần phụ, không được làm hỏng trang.
 */
export function useResourceHistory(groups: HistoryGroup[], enabled = true, refreshKey?: string | number | null): HistoryEntry[] {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const key = groups.map((g) => `${g.type}:${[...g.ids].sort((a, b) => a - b).join(".")}`).join("|");

    useEffect(() => {
        const wanted = groups.filter((g) => g.ids.length > 0);
        if (!enabled || wanted.length === 0) { setEntries([]); return; }
        let alive = true;
        Promise.all([
            getUserDirectory().then((r) => r.data).catch(() => []),
            ...wanted.map((g) => getResourceHistory(g.type, g.ids).then((r) => r.data).catch(() => [] as AuditLogResponse[])),
        ]).then(([dir, ...lists]) => {
            if (!alive) return;
            const names = new Map((dir as { id: number; fullName: string }[]).map((u) => [u.id, u.fullName]));
            const all = (lists as AuditLogResponse[][]).flat()
                .map((l) => ({ ...l, who: l.actorName ?? names.get(l.actorUserId) ?? null }))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setEntries(all);
        });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, enabled, refreshKey]);

    return entries;
}
