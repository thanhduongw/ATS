import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Màu thương hiệu do Quản trị doanh nghiệp chọn trên web (mục 4.1), dùng chung cho app.
 *
 * Màu trong app nằm trong `StyleSheet.create` nên phải có ngay lúc các module được nạp. Vì vậy:
 *   1. Lúc khởi động, `colors.ts` đọc ĐỒNG BỘ màu đã lưu ở lần mở trước (SecureStore / localStorage).
 *   2. Sau đó `syncBrandFromServer()` hỏi API công khai; nếu doanh nghiệp đã đổi màu thì lưu lại,
 *      màu mới có hiệu lực từ lần mở app kế tiếp (trên trình duyệt thì tải lại trang luôn).
 *
 * Cùng công thức với web (`frontend/src/app/brand.ts`): màu phải đạt tương phản 4,5:1 với chữ trắng,
 * nhạt hơn thì tự làm đậm, giữ nguyên sắc độ.
 */
export const DEFAULT_BRAND = "#0A59F7";
const MIN_CONTRAST = 4.5;
const KEY = "ats.brandColor";

export interface BrandPalette {
  color: string;
  /** Bản đậm hơn: trạng thái nhấn, chữ trên nền tonal. */
  dark: string;
  soft: string;
  faint: string;
  deep: string;
  deep2: string;
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);

function toRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v * 255)))
      .toString(16)
      .padStart(2, "0");
  return ("#" + hex(f(0)) + hex(f(8)) + hex(f(4))).toUpperCase();
}

function contrastWithWhite(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

function ensureContrast(hex: string): string {
  let out = hex.toUpperCase();
  const [h, s, l0] = toHsl(out);
  let l = l0;
  while (contrastWithWhite(out) < MIN_CONTRAST && l > 0.02) {
    l -= 0.01;
    out = fromHsl(h, s, l);
  }
  return out;
}

export function derivePalette(input?: string | null): BrandPalette {
  const color = ensureContrast(isHex(input) ? input : DEFAULT_BRAND);
  const isDefault = color === DEFAULT_BRAND;
  const [h, s, l] = toHsl(color);
  return {
    color,
    dark: isDefault ? "#0848C7" : fromHsl(h, s, Math.max(0, l - 0.09)),
    soft: color + "19",
    faint: color + "0F",
    deep: isDefault ? "#061A44" : fromHsl(h, Math.min(s, 0.84), 0.145),
    deep2: isDefault ? "#0B2F78" : fromHsl(h, Math.min(s, 0.83), 0.26),
  };
}

/** Đọc đồng bộ màu đã lưu; lỗi đọc thì dùng màu mặc định. */
export function readCachedBrand(): string | null {
  try {
    const v =
      Platform.OS === "web"
        ? typeof localStorage !== "undefined"
          ? localStorage.getItem(KEY)
          : null
        : SecureStore.getItem(KEY);
    return isHex(v) ? v : null;
  } catch {
    return null;
  }
}

function writeCachedBrand(hex: string | null): void {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return;
      if (hex) localStorage.setItem(KEY, hex);
      else localStorage.removeItem(KEY);
    } else if (hex) {
      SecureStore.setItem(KEY, hex);
    } else {
      void SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // không lưu được thì lần sau hỏi lại máy chủ
  }
}

/**
 * Hỏi API công khai màu thương hiệu hiện tại. Khác với màu đang dùng thì lưu lại; trên trình duyệt tải lại
 * trang để áp dụng ngay, trên điện thoại màu mới có hiệu lực từ lần mở app kế tiếp.
 */
export async function syncBrandFromServer(apiBaseUrl: string): Promise<void> {
  try {
    const res = await fetch(`${apiBaseUrl}/auth/public/theme`);
    if (!res.ok) return;
    const body = (await res.json()) as { brandColor?: string | null };
    const next = isHex(body.brandColor) ? body.brandColor.toUpperCase() : null;
    const current = readCachedBrand();
    if (next === current) return;
    writeCachedBrand(next);
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.reload();
  } catch {
    // mất mạng: giữ màu đang có
  }
}
