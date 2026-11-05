/**
 * Cấu hình trang tuyển dụng công khai (C01) do Quản trị soạn ở A09/A10. Lưu thành JSON ở auth-service
 * (`careers_page`: bản nháp + bản đã xuất bản). Quyết định 05/11/2026: 6 khối THỨ TỰ CỐ ĐỊNH, chỉ ẩn/hiện;
 * biểu tượng phúc lợi chọn từ bộ có sẵn.
 */
export type BlockKey = "hero" | "featured" | "life" | "benefits" | "offices" | "footer";

export const BLOCK_ORDER: BlockKey[] = ["hero", "featured", "life", "benefits", "offices", "footer"];

export const BLOCK_LABEL: Record<BlockKey, string> = {
    hero: "Ảnh bìa & khẩu hiệu",
    featured: "Vị trí nổi bật",
    life: "Đời sống",
    benefits: "Phúc lợi",
    offices: "Văn phòng",
    footer: "Chân trang",
};

export const BENEFIT_ICONS = [
    "money", "health", "home", "book", "food", "calendar", "laptop", "team", "trophy", "car", "gift", "heart",
] as const;
export type BenefitIconKey = (typeof BENEFIT_ICONS)[number];

export const BENEFIT_ICON_LABEL: Record<BenefitIconKey, string> = {
    money: "Lương thưởng", health: "Sức khoẻ", home: "Làm việc linh hoạt", book: "Học tập", food: "Ăn uống",
    calendar: "Nghỉ phép", laptop: "Thiết bị", team: "Đội ngũ", trophy: "Thăng tiến", car: "Đi lại",
    gift: "Quà tặng", heart: "Chăm sóc",
};

export interface CareersBenefit { icon: BenefitIconKey; title: string; description: string }
export interface CareersPhoto { url: string; caption: string }

export interface CareersConfig {
    visible: Record<BlockKey, boolean>;
    hero: {
        coverUrl: string;
        /** Dòng nhỏ phía trên khẩu hiệu. "{jobs}" được thay bằng số vị trí đang mở. */
        eyebrow: string;
        tagline: string;
        description: string;
        quote: string;
        quoteAuthor: string;
    };
    featured: { title: string; count: number };
    life: { title: string; photos: CareersPhoto[] };
    benefits: { title: string; items: CareersBenefit[] };
    offices: { title: string };
}

export function defaultConfig(company?: { tagline?: string | null; description?: string | null; bannerUrl?: string | null; benefits?: string | null } | null): CareersConfig {
    let items: CareersBenefit[] = [];
    try {
        const parsed = JSON.parse(company?.benefits ?? "[]") as { title?: string; description?: string }[];
        items = parsed.filter((b) => b.title).map((b) => ({ icon: "gift", title: b.title ?? "", description: b.description ?? "" }));
    } catch { /* phúc lợi cũ không phải JSON */ }
    return {
        visible: { hero: true, featured: true, life: true, benefits: true, offices: true, footer: true },
        hero: {
            coverUrl: company?.bannerUrl ?? "",
            eyebrow: "{jobs} vị trí đang mở",
            tagline: company?.tagline ?? "",
            description: company?.description ?? "",
            quote: "",
            quoteAuthor: "",
        },
        featured: { title: "Vị trí nổi bật", count: 3 },
        life: { title: "Đời sống tại công ty", photos: [] },
        benefits: { title: "Chăm lo để bạn tập trung làm điều giỏi nhất", items },
        offices: { title: "Văn phòng" },
    };
}

/** Đọc JSON đã lưu, bù trường thiếu bằng mặc định (cấu hình cũ vẫn mở được). */
export function parseConfig(json: string | null | undefined, fallback: CareersConfig): CareersConfig {
    if (!json) return fallback;
    try {
        const v = JSON.parse(json) as Partial<CareersConfig>;
        return {
            visible: { ...fallback.visible, ...(v.visible ?? {}) },
            hero: { ...fallback.hero, ...(v.hero ?? {}) },
            featured: { ...fallback.featured, ...(v.featured ?? {}) },
            life: { ...fallback.life, ...(v.life ?? {}) },
            benefits: { ...fallback.benefits, ...(v.benefits ?? {}) },
            offices: { ...fallback.offices, ...(v.offices ?? {}) },
        };
    } catch {
        return fallback;
    }
}
