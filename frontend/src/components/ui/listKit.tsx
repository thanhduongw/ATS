import type { ReactNode } from "react";
import { COLORS, RADIUS } from "../../app/theme";
import { ScreenTitle } from "./designKit";

/* ============================================================
   Mẫu màn chính dạng danh sách — DS04 "Mẫu màn chính (danh sách)" và DS06:
   tiêu đề + nút chính → tab trạng thái có số đếm → thanh lọc ngang → bảng gọn
   → cả dòng bấm được, mũi tên ở cuối dòng.
   - Tab chỉ dùng cho trạng thái, có số đếm; tab cần xử lý đứng đầu, "Tất cả" đứng cuối.
   - Bộ lọc nằm ngang dưới tab: ô tìm kiếm trước, rồi các ô chọn.
   - Bảng 4–6 cột, KHÔNG có nút thao tác nhanh trong bảng.
============================================================ */

export interface StatusTabItem<K extends string = string> {
    key: K;
    label: string;
    /** Số đếm cố định (nếu đã biết). */
    count?: number;
}

/** Tab trạng thái có số đếm (DS04: "Đang hoạt động 10 · Chờ kích hoạt 2 · … · Tất cả 13"). */
export function StatusTabs<K extends string>({
    items, active, onChange, counts,
}: {
    items: StatusTabItem<K>[];
    active: K;
    onChange: (key: K) => void;
    /** Số đếm lấy từ API (ghi đè `count`). */
    counts?: Partial<Record<K, number | undefined>>;
}) {
    return (
        <div role="tablist" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {items.map((it) => {
                const selected = it.key === active;
                const n = counts?.[it.key] ?? it.count;
                return (
                    <button
                        key={it.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(it.key)}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px",
                            border: 0, borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                            fontWeight: selected ? 600 : 500,
                            background: selected ? COLORS.cardBg : "transparent",
                            color: selected ? COLORS.textPrimary : COLORS.textSecondary,
                        }}
                    >
                        {it.label}
                        {n != null && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: selected ? COLORS.primary : COLORS.textMuted }}>{n}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** Thanh lọc ngang dưới tab: ô tìm kiếm trước, rồi các ô chọn; phụ trợ bên phải. */
export function ListFilters({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 0 }}>{children}</div>
            {extra && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{extra}</div>}
        </div>
    );
}

/** Khung màn chính danh sách. */
export default function ListPage({
    title, subtitle, actions, tabs, filters, children, footnote,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    /** Nút chính (và tối đa một nút phụ) của màn. */
    actions?: ReactNode;
    tabs?: ReactNode;
    filters?: ReactNode;
    /** Thường là một `<Table>` đặt trong thẻ trắng. */
    children: ReactNode;
    /** Dòng phụ dưới thanh lọc, ví dụ "13 tài khoản". */
    footnote?: ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ScreenTitle title={title} subtitle={subtitle} actions={actions} />
            {tabs}
            {(filters || footnote) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filters}
                    {footnote && <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{footnote}</span>}
                </div>
            )}
            <section style={{ background: COLORS.cardBg, borderRadius: RADIUS.lg, overflow: "hidden" }}>{children}</section>
        </div>
    );
}
