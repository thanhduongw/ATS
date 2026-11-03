import { useEffect, useRef, useState } from "react";
import { RightOutlined } from "@ant-design/icons";
import { COLORS } from "../../app/theme";

/**
 * Đếm số bản ghi cho từng tab bằng `totalItems` của API danh sách
 * (gọi `size=1` cho mỗi tab — xem mục G3 của docs/learning/02-doi-chieu-thiet-ke-ui.md).
 * `deps` thay đổi (bộ lọc, tải lại) thì đếm lại.
 */
export function useStatusCounts<K extends string>(
    keys: readonly K[],
    countOf: (key: K) => Promise<number>,
    deps: unknown[] = [],
): Partial<Record<K, number>> {
    const [counts, setCounts] = useState<Partial<Record<K, number>>>({});
    const countRef = useRef(countOf);
    useEffect(() => { countRef.current = countOf; });
    const depKey = JSON.stringify(deps);
    const keyList = keys.join("|");
    useEffect(() => {
        let alive = true;
        Promise.all(
            keyList.split("|").map((k) =>
                countRef.current(k as K).then((n) => [k, n] as const).catch(() => [k, undefined] as const),
            ),
        ).then((pairs) => {
            if (!alive) return;
            const next: Partial<Record<K, number>> = {};
            pairs.forEach(([k, n]) => { if (n != null) next[k as K] = n; });
            setCounts(next);
        });
        return () => { alive = false; };
    }, [keyList, depKey]);
    return counts;
}

/** Cột mũi tên cuối dòng (DS06: cả dòng bấm được, mũi tên ở cuối). */
export const rowArrowColumn = {
    key: "__arrow",
    width: 40,
    align: "right" as const,
    render: () => <RightOutlined style={{ color: COLORS.textMuted, fontSize: 12 }} />,
};

/** Tô nền dòng cần chú ý (DS06: cam = cần làm, tím = cần sửa). */
export function attentionRowStyle(kind?: "todo" | "fix" | null) {
    if (kind === "todo") return { background: COLORS.warningBg };
    if (kind === "fix") return { background: COLORS.interviewBg };
    return undefined;
}

