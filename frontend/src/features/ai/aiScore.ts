import type { AiScoreStatus, AiTier } from "./types";

/** Ba xếp loại gợi ý — khớp ai-service v2 (docs/DE_XUAT_CHAM_DIEM_CV.md, Bước 6): T = 62,5 ± 5. */
// [GIẢI THÍCH] Nhãn tiếng Việt và màu của 3 xếp loại (dùng cho huy hiệu ở danh sách và thẻ AI).
// Chưa phân loại = AI không chắc chắn hoặc thiếu thông tin, HR xem tay. Không có nghĩa là "kém".
// color = màu thẻ antd, stroke = màu vòng tròn điểm. Muốn đổi chữ/màu thì sửa ở đây.
export const AI_TIER_META: Record<AiTier, { label: string; color: string; stroke: string }> = {
    FIT: { label: "Phù hợp", color: "green", stroke: "#22C55E" },
    UNCLASSIFIED: { label: "Chưa phân loại", color: "gold", stroke: "#F59E0B" },
    NOT_FIT: { label: "Không phù hợp", color: "red", stroke: "#DC2626" },
};

/** Xếp loại lạ (vd giá trị cũ còn sót trong dữ liệu) -> null, để giao diện bỏ qua thay vì lỗi. */
export const aiTierMeta = (tier: string | null | undefined) =>
    tier && tier in AI_TIER_META ? AI_TIER_META[tier as AiTier] : null;

// [GIẢI THÍCH] Danh sách lựa chọn cho bộ lọc "Xếp loại AI" ở trang danh sách.
export const AI_TIER_OPTIONS = (Object.keys(AI_TIER_META) as AiTier[])
    .map((t) => ({ value: t, label: AI_TIER_META[t].label }));

// [GIẢI THÍCH] true khi hồ sơ đang chờ chấm hoặc đang chấm.
export const isAiScoring = (status: AiScoreStatus | null | undefined) =>
    status === "PENDING" || status === "PROCESSING";
