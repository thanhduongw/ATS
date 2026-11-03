/**
 * Bảng màu theo `docs/UI` — DS01 "Màu sắc" (Interactive UI Prototype.html) và DS05
 * "Component mobile". Web và mobile dùng CHUNG một bảng màu (quyết định A1, A2, X2 trong
 * docs/learning/02 và 03); web ở `frontend/src/app/theme.ts`.
 *
 * Canvas viết nhiều màu dạng trong suốt (`#182431` + alpha). Ở đây giữ đúng dạng 8 chữ số
 * `#RRGGBBAA` cho nền/viền (để nằm đúng trên cả nền xám lẫn nền trắng), còn MÀU CHỮ thì
 * quy ra màu đặc để kiểm được độ tương phản.
 *
 * App chỉ có giao diện sáng (`app.json` đặt `userInterfaceStyle: "light"`).
 */
export const COLORS = {
  /* Thương hiệu */
  primary: "#0A59F7",
  /** DS01 "Thương hiệu · nhấn" `#0848c7`. Dùng cho chữ trên nền tonal — 7.0:1. */
  primaryDark: "#0848C7",
  /** DS01 "Thương hiệu · nền 10%": ô icon, ô ngày, hộp đếm ngược, mục đang chọn. */
  primarySoft: "#0A59F719",
  /** DS01 "Thương hiệu · nền 6%": dòng thông báo chưa đọc, dòng được chọn. */
  primaryFaint: "#0A59F70F",
  /** DS01 "Xanh đậm": nền màn chào M01. */
  navy: "#061A44",
  /** DS01 "Xanh đậm 2": điểm đầu dải màu thư mời, ảnh bìa. */
  navy2: "#0B2F78",

  /* Bề mặt */
  /** Nền trang — canvas `background-secondary`. */
  body: "#F1F3F5",
  /** Nền thẻ, sheet — canvas `comp-background`. */
  cardBg: "#FFFFFF",
  /** Nền ô nhập, chip chưa chọn, nút tròn — canvas `#1824310c` (~5%). */
  fill: "#1824310C",
  /** Nền nút phụ (tonal) và ô trống của thanh tiến trình — canvas `#18243119` (~10%). */
  fillStrong: "#18243119",
  /** Thanh tab dưới và thanh hành động dưới: nền trang, gần như đục. */
  barBg: "#F1F3F5F2",
  /** Nền mờ phía sau sheet. */
  backdrop: "#00000033",

  /* Chữ */
  textPrimary: "#182431",
  /**
   * Canvas dùng `#18243199` (60%). Quy ra màu đặc chỉ đạt 4.1:1 trên nền xám — dưới mức
   * 4.5:1 cho chữ thường — nên nâng lên 64%: 4.8:1 trên trắng, 4.6:1 trên `body`.
   */
  textSecondary: "#6B737B",
  /** 40% — CHỈ cho placeholder, chữ vô hiệu, chấm trạng thái trung tính. Không dùng cho nội dung. */
  textMuted: "#A3A7AD",
  textOnPrimary: "#FFFFFF",

  /* Viền */
  /** Đường kẻ 0.5px giữa các dòng, viền trên thanh tab — canvas `#18243133`. */
  divider: "#18243133",

  /* Ngữ nghĩa — tên theo canvas */
  /** Canvas `warning`. Dùng cho chấm, icon, viền. KHÔNG dùng làm màu chữ trên nền xám (2.9:1). */
  error: "#FA2A2D",
  /** Chữ màu đỏ (nút "Từ chối", chữ lỗi dưới ô nhập). 5.4:1 trên nền tonal. */
  errorText: "#B91C1C",
  /** Canvas `alert`. */
  warning: "#FF7500",
  /** DS01 "Thành công". */
  success: "#00A06B",
  /** Giữ tên cũ — cùng màu với success. */
  successDeep: "#00A06B",
  /** Xanh dương của các gợi ý "thông minh" (icon lấp lánh ở dòng khớp kỹ năng, canvas N26). Chỉ dùng cho icon. */
  ai: "#2A7DFF",
  /** DS01 "Tím": phỏng vấn, đề xuất đổi giờ, cần sửa. */
  interview: "#7C4DFF",
} as const;

/**
 * Sắc độ của `<StatusChip>` — DS06 "Màu trạng thái": nền nhạt + chấm + chữ cùng màu.
 * Ứng tuyển/Bản nháp xám · Sàng lọc/Đã duyệt xanh lá · Phỏng vấn/Yêu cầu sửa tím ·
 * Thư mời/Chờ duyệt cam · Đã tuyển xanh dương · Từ chối đỏ.
 */
export const STATUS_TONES = {
  neutral: { bg: COLORS.fill, dot: COLORS.textSecondary, text: COLORS.textSecondary },
  brand: { bg: "#0A59F719", dot: COLORS.primary, text: COLORS.primary },
  interview: { bg: "#7C4DFF1A", dot: COLORS.interview, text: COLORS.interview },
  warning: { bg: "#FF75001F", dot: COLORS.warning, text: COLORS.warning },
  success: { bg: "#00CB8724", dot: COLORS.success, text: COLORS.success },
  danger: { bg: "#FA2A2D17", dot: COLORS.error, text: COLORS.error },
} as const;

/** Dải màu AI (DS01) — CHỈ cho điểm AI, nhãn AI. Vẽ bằng react-native-svg (quyết định X5). */
export const AI_GRADIENT_STOPS = [
  { offset: 0, color: "#42CBF7" },
  { offset: 0.4, color: "#2A7DFF" },
  { offset: 0.75, color: "#A479FF" },
  { offset: 1, color: "#FF678C" },
] as const;

export type StatusTone = keyof typeof STATUS_TONES;
