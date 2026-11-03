import type { Dayjs } from "dayjs";

/**
 * Backend nhận kiểu `LocalDateTime` — chuỗi KHÔNG kèm offset múi giờ.
 *
 * Nếu gửi `date.toISOString()` (giờ UTC, kết thúc bằng "Z") thì Jackson bỏ mất phần offset
 * và lưu thẳng giờ UTC làm giờ địa phương → lệch đúng bằng chênh lệch múi giờ
 * (Việt Nam UTC+7: chọn 15:00 nhưng lưu thành 08:00).
 *
 * Luôn dùng hàm này khi gửi một thời điểm lên backend.
 */
export const toLocalDateTimeString = (d: Dayjs) => d.format("YYYY-MM-DDTHH:mm:ss");

/**
 * Định dạng thời gian theo DS06 "Định dạng dữ liệu": mốc gần dùng thời gian tương đối
 * ("Vừa xong", "10 phút trước", "2 giờ trước", "Hôm qua", "3 ngày trước"), xa hơn dùng ngày
 * (trong năm hiện tại rút gọn "27/10", khác năm "12/10/2025").
 */
export function relativeTime(value: string | null | undefined, now: Date = new Date()): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (d.getTime() >= startOfToday) return `${diffHour} giờ trước`;
    const days = Math.ceil((startOfToday - d.getTime()) / 86400000);
    if (days <= 1) return "Hôm qua";
    if (days <= 6) return `${days} ngày trước`;
    return shortDate(value, now);
}

/** "27/10" trong năm hiện tại, "27/10/2025" nếu khác năm (DS06). */
export function shortDate(value: string | null | undefined, now: Date = new Date()): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return d.getFullYear() === now.getFullYear() ? `${dd}/${mm}` : `${dd}/${mm}/${d.getFullYear()}`;
}
