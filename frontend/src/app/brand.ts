/**
 * Màu thương hiệu do Quản trị doanh nghiệp chọn (mục 4.1), áp cho toàn bộ web.
 *
 * Cách hoạt động: các khoá màu thương hiệu trong `COLORS` (theme.ts) trỏ tới biến CSS `--ats-brand*`.
 * File này tính bảng màu từ một mã #RRGGBB và ghi các biến đó lên `:root`, nên đổi màu là giao diện đổi ngay,
 * không cần tải lại trang. Ant Design cần mã màu thật nên `buildAtsTheme(palette)` nhận bảng màu này.
 *
 * Tương phản: màu thương hiệu làm nền cho chữ trắng (nút chính) và làm màu chữ trên nền trắng (liên kết),
 * nên phải đạt tối thiểu 4,5:1 so với trắng (WCAG AA). Màu nhạt hơn được tự làm đậm dần, giữ nguyên sắc độ.
 */
export const DEFAULT_BRAND = "#0A59F7";
export const MIN_CONTRAST = 4.5;
const CACHE_KEY = "ats.brandColor";

export interface BrandPalette {
    /** Màu đang dùng (đã đủ tương phản). */
    color: string;
    hover: string;
    /** Nền 10%. */
    soft: string;
    /** Nền 6%. */
    faint: string;
    /** Xanh đậm: nền màn chào, chân trang tuyển dụng. */
    deep: string;
    /** Điểm đầu dải màu ảnh bìa, thư mời. */
    deep2: string;
    rgb: string;
}

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);

function toRgb(hex: string): [number, number, number] {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function toHsl(hex: string): [number, number, number] {
    const [r, g, b] = toRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

function luminance(hex: string): number {
    const [r, g, b] = toRgb(hex).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ lệ tương phản WCAG giữa hai màu (1 – 21). */
export function contrastRatio(a: string, b: string): number {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Làm đậm dần (giữ sắc độ) cho tới khi đủ tương phản với chữ trắng. Màu đã đủ thì trả nguyên. */
export function ensureContrast(hex: string, min = MIN_CONTRAST): string {
    if (!isHexColor(hex)) return DEFAULT_BRAND;
    let out = hex.toUpperCase();
    const [h, s, l0] = toHsl(out);
    let l = l0;
    while (contrastRatio(out, "#FFFFFF") < min && l > 0.02) {
        l -= 0.01;
        out = fromHsl(h, s, l);
    }
    return out;
}

export function derivePalette(input?: string | null): BrandPalette {
    const color = ensureContrast(isHexColor(input) ? input : DEFAULT_BRAND);
    const [h, s, l] = toHsl(color);
    const isDefault = color === DEFAULT_BRAND;
    return {
        color,
        hover: isDefault ? "#0848C7" : fromHsl(h, s, Math.max(0, l - 0.09)),
        soft: color + "19",
        faint: color + "0F",
        deep: isDefault ? "#061A44" : fromHsl(h, Math.min(s, 0.84), 0.145),
        deep2: isDefault ? "#0B2F78" : fromHsl(h, Math.min(s, 0.83), 0.26),
        rgb: toRgb(color).join(" "),
    };
}

/** Ghi bảng màu lên `:root`. */
export function applyBrandVars(p: BrandPalette): void {
    const st = document.documentElement.style;
    st.setProperty("--ats-brand", p.color);
    st.setProperty("--ats-brand-hover", p.hover);
    st.setProperty("--ats-brand-soft", p.soft);
    st.setProperty("--ats-brand-faint", p.faint);
    st.setProperty("--ats-brand-deep", p.deep);
    st.setProperty("--ats-brand-deep2", p.deep2);
    st.setProperty("--ats-brand-rgb", p.rgb);
}

/** Màu lưu từ lần mở trước, để trang không nháy màu mặc định trong lúc chờ API. */
export function cachedBrand(): string | null {
    try {
        const v = localStorage.getItem(CACHE_KEY);
        return isHexColor(v) ? v : null;
    } catch {
        return null;
    }
}

export function cacheBrand(hex: string | null): void {
    try {
        if (hex) localStorage.setItem(CACHE_KEY, hex);
        else localStorage.removeItem(CACHE_KEY);
    } catch { /* trình duyệt chặn localStorage: bỏ qua */ }
}

/** Nền màu thương hiệu ở độ đậm `percent`% (thay cho cách nối đuôi alpha vào mã hex). */
export const brandAlpha = (percent: number) => `color-mix(in srgb, var(--ats-brand) ${percent}%, transparent)`;
