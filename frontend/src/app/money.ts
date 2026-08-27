/* ============================================================
   Định dạng tiền tệ dùng chung toàn hệ thống (Tuyển dụng,
   Ứng viên, Offer). Luôn hiển thị theo định dạng vi-VN.
============================================================ */

/** "15.000.000 đ" — trả về "—" khi không có giá trị. */
export function formatMoney(value: number | null | undefined) {
    if (value === null || value === undefined) return "—";

    return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

/** Khoảng lương: "15.000.000 – 25.000.000 đ", hoặc "Thỏa thuận" khi trống cả hai. */
export function formatSalaryRange(
    min: number | null | undefined,
    max: number | null | undefined,
) {
    if (min == null && max == null) return "Thỏa thuận";
    if (min != null && max != null) {
        const f = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
        return `${f(min)} – ${f(max)} đ`;
    }
    return min != null ? `Từ ${formatMoney(min)}` : `Đến ${formatMoney(max)}`;
}

/** Rút gọn theo triệu: "15 – 25 tr" — dùng cho cột bảng hẹp. */
export function formatSalaryShort(
    min: number | null | undefined,
    max: number | null | undefined,
) {
    const tr = (n: number) => `${(n / 1_000_000).toFixed(0)}`;
    if (min == null && max == null) return "Thỏa thuận";
    if (min != null && max != null) return `${tr(min)} – ${tr(max)} tr`;
    return min != null ? `Từ ${tr(min)} tr` : `Đến ${tr(max as number)} tr`;
}

/* ── Dùng cho InputNumber nhập tiền ─────────────────────── */

export const moneyFormatter = (value: number | string | undefined) =>
    value || value === 0 ? new Intl.NumberFormat("vi-VN").format(Number(value)) : "";

export const moneyParser = (value: string | undefined) =>
    value ? Number(value.replace(/\D/g, "")) : 0;
