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

const pad = (n: number) => String(n).padStart(2, "0");

const valid = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "28.000.000 đ" — số tiền đầy đủ cho thư mời (khác `formatSalary` rút gọn theo triệu). */
export function formatMoney(n?: number | null): string {
  if (n == null) return "—";
  const s = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} ${STRINGS.format.currency}`;
}

/** "10:00" */
export function formatTime(iso?: string | null): string {
  const d = valid(iso);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "—";
}

/** "10:00 – 11:00" từ giờ bắt đầu + số phút. */
export function formatTimeRange(iso?: string | null, minutes?: number | null): string {
  const d = valid(iso);
  if (!d) return "—";
  if (!minutes) return formatTime(iso);
  const end = new Date(d.getTime() + minutes * 60_000);
  return `${formatTime(iso)} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

/** "Thứ Bảy, 26/09/2026" */
export function formatLongDate(iso?: string | null): string {
  const d = valid(iso);
  return d ? `${STRINGS.format.weekdays[d.getDay()]}, ${formatDate(iso)}` : "—";
}

/** Ô ngày của lịch phỏng vấn: { month: "TH 9", day: "26" }. */
export function dateTile(iso?: string | null): { month: string; day: string } {
  const d = valid(iso);
  return d ? { month: STRINGS.format.monthShort(d.getMonth() + 1), day: pad(d.getDate()) } : { month: "—", day: "—" };
}

/** Thời gian còn lại tới hạn: "5 ngày 04 giờ", "3 giờ"; đã quá hạn → null. */
export function formatCountdown(iso?: string | null, now: Date = new Date()): string | null {
  const d = valid(iso);
  if (!d) return null;
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  return days > 0 ? STRINGS.format.daysHours(days, pad(hours % 24)) : STRINGS.format.hoursLeft(Math.max(hours, 1));
}

/** Hai chữ cái cho ảnh đại diện, lấy tên đệm cuối + tên như canvas M13: "Nguyễn Hoàng Nam" → "HN". */
export function initials(fullName?: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = (w?: string) => (w ?? "").charAt(0);
  if (parts.length === 1) return first(parts[0]).toUpperCase();
  return (first(parts[parts.length - 2]) + first(parts[parts.length - 1])).toUpperCase();
}

/** "Còn 5 ngày" (làm tròn lên) khi hạn còn ở tương lai; đã quá hạn → null. */
export function formatDaysLeft(iso?: string | null, now: Date = new Date()): string | null {
  const d = valid(iso);
  if (!d) return null;
  const ms = d.getTime() - now.getTime();
  return ms > 0 ? STRINGS.format.daysLeft(Math.ceil(ms / 86_400_000)) : null;
}

/**
 * Tên file CV lấy từ đuôi URL lưu trên S3 (backend không trả tên gốc riêng). Backend đặt tên
 * dạng `<uuid>-<tên gốc>` (vd. `1da15389-…-1858-CV_Nguyen_Van_An.pdf`) → bỏ phần uuid đầu.
 */
export function cvFileName(url?: string | null): string {
  let last = (url ?? "").split("?")[0]?.split("/").pop() ?? "";
  try {
    last = decodeURIComponent(last);
  } catch {
    // giữ nguyên nếu URL mã hóa hỏng
  }
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]?/i, "") || last;
}
