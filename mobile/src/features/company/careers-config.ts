import { COLORS, heroColor } from "@/theme";
import type { CompanyResponse } from "@/types/api";

/**
 * Cấu hình trang tuyển dụng do Quản trị soạn ở web (A09/A10), lưu ở auth-service thành CHUỖI JSON
 * (`careers_page.published_config`). Backend không có schema cho nội dung này nên khai báo ở đây — CÙNG hình dạng
 * với `frontend/src/features/careers/careersConfig.ts`; web đổi cấu trúc thì sửa cả hai chỗ.
 * Mobile chỉ dùng khối "hero" (ảnh bìa & khẩu hiệu), "featured" (vị trí nổi bật) và ảnh đời sống đầu tiên
 * (thay ảnh bìa khi chưa có, giống web).
 */
export type HeroBackground = "brand" | "color" | "gradient";

export interface CareersConfig {
  visible: { hero: boolean; featured: boolean };
  hero: {
    coverUrl: string;
    /** "{jobs}" được thay bằng số vị trí đang mở. */
    eyebrow: string;
    tagline: string;
    description: string;
    background: HeroBackground;
    color1?: string;
    color2?: string;
  };
  featured: { title: string; count: number };
  /** Ảnh đời sống đầu tiên — làm ảnh đầu trang khi Quản trị chưa đặt ảnh bìa. */
  firstPhotoUrl: string;
}

type Raw = {
  visible?: Record<string, boolean>;
  hero?: Partial<CareersConfig["hero"]> & { background?: string };
  featured?: Partial<CareersConfig["featured"]>;
  life?: { photos?: { url?: string }[] };
};

/** Mặc định khi Quản trị chưa xuất bản trang (như `defaultConfig` của web). */
export function defaultCareersConfig(company?: CompanyResponse | null): CareersConfig {
  return {
    visible: { hero: true, featured: true },
    hero: {
      coverUrl: company?.bannerUrl ?? "",
      eyebrow: "{jobs} vị trí đang mở",
      tagline: company?.tagline ?? "",
      description: company?.description ?? "",
      background: "brand",
    },
    featured: { title: "Vị trí nổi bật", count: 3 },
    firstPhotoUrl: "",
  };
}

/** Đọc JSON đã xuất bản, bù trường thiếu bằng mặc định (cấu hình cũ vẫn mở được; JSON hỏng → mặc định). */
export function parseCareersConfig(json: string | null | undefined, fallback: CareersConfig): CareersConfig {
  if (!json) return fallback;
  try {
    const v = JSON.parse(json) as Raw;
    const bg = v.hero?.background;
    return {
      visible: {
        hero: v.visible?.hero ?? fallback.visible.hero,
        featured: v.visible?.featured ?? fallback.visible.featured,
      },
      hero: {
        ...fallback.hero,
        ...v.hero,
        background: bg === "color" || bg === "gradient" ? bg : "brand",
      },
      featured: {
        title: v.featured?.title?.trim() || fallback.featured.title,
        count: Math.max(1, Number(v.featured?.count) || fallback.featured.count),
      },
      firstPhotoUrl: v.life?.photos?.find((p) => p.url)?.url ?? "",
    };
  } catch {
    return fallback;
  }
}

/**
 * Các điểm màu của nền phần đầu trang (dải màu từ trên xuống, hơi chéo). "brand" = dải màu thương hiệu như web
 * (`GRADIENTS.hero`: đậm → đậm 2 → màu chính); "color" = một màu; "gradient" = color1 → color2.
 * Màu Quản trị chọn quá nhạt được làm đậm cho chữ trắng đọc được.
 */
export function heroColors(hero: CareersConfig["hero"]): string[] {
  if (hero.background === "color") return [heroColor(hero.color1, COLORS.primary)];
  if (hero.background === "gradient") {
    const c1 = heroColor(hero.color1, COLORS.primary);
    return [c1, heroColor(hero.color2, c1)];
  }
  return [COLORS.navy, COLORS.navy2, COLORS.primary];
}
