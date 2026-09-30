import { STRINGS } from "@/lib/strings";

const F = STRINGS.format;

/**
 * "25 triệu", "25,5 triệu". Tự làm thay vì Intl: Hermes trên một số máy Android không có đủ
 * dữ liệu locale vi-VN, Intl.NumberFormat ra dấu phân cách kiểu Mỹ.
 */
function millions(n: number): string {
  const m = Math.round((n / 1_000_000) * 10) / 10;
  return String(m).replace(".", ",");
}

/**
 * Khoảng lương theo triệu, gọn cho điện thoại: "25 – 40 triệu", "Từ 25 triệu", "Thỏa thuận".
 * Backend lưu VND đầy đủ (numeric), giống web (`frontend/src/app/money.ts`).
 */
export function formatSalary(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return F.negotiable;
  if (min != null && max != null) {
    return min === max ? `${millions(min)} ${F.million}` : `${millions(min)} – ${millions(max)} ${F.million}`;
  }
  return min != null ? `${F.from} ${millions(min)} ${F.million}` : `${F.upTo} ${millions(max!)} ${F.million}`;
}

/** dd/MM/yyyy theo giờ máy. Chuỗi rỗng/không hợp lệ → "—" (không bao giờ "Invalid Date"). */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "Vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; quá 7 ngày thì ra ngày cụ thể. */
export function formatRelative(iso?: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return F.justNow;
  if (minutes < 60) return F.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return F.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days <= 7) return F.daysAgo(days);
  return formatDate(iso);
}

/** Bỏ dấu + chữ thường, để tìm "ky thuat" vẫn ra "Kỹ thuật". */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
