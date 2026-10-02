/**
 * Bảng màu lấy từ canvas thiết kế mobile (HarmonyOS redesign, trang "Mobile" M01–M20,
 * artboard `Main` liệt kê bảng màu). Mobile CỐ Ý khác web từ đợt thiết kế này — web giữ
 * nguyên Ant Design, không đồng bộ ngược.
 *
 * Canvas viết nhiều màu dạng trong suốt (`#182431` + alpha). Ở đây giữ đúng dạng 8 chữ số
 * `#RRGGBBAA` cho nền/viền (để nằm đúng trên cả nền xám lẫn nền trắng), còn MÀU CHỮ thì
 * quy ra màu đặc để kiểm được độ tương phản.
 *
 * App chỉ có giao diện sáng (`app.json` đặt `userInterfaceStyle: "light"`).
 */
export const COLORS = {
  /* Thương hiệu */
  primary: "#0E7A5F",
  /** Màu nhấn/đè của canvas (`a:hover`). Dùng cho chữ trên nền tonal — 6.6:1. */
  primaryDark: "#0A5C47",
  /** Nền nhạt của màu chính: ô icon, ô ngày, hộp đếm ngược (canvas `#0e7a5f19`). */
  primarySoft: "#0E7A5F19",

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
  /** Canvas `connected`. */
  success: "#00CB87",
  /** Xanh lá đậm hơn cho icon trên nền nhạt (canvas M14). */
  successDeep: "#00A06B",
  /** Xanh dương của các gợi ý "thông minh" (icon lấp lánh ở dòng khớp kỹ năng, canvas N26). Chỉ dùng cho icon. */
  ai: "#2A7DFF",
  /** Tím của vòng phỏng vấn (canvas `Main` → "Phỏng vấn"). */
  interview: "#8A2BE2",
} as const;

/**
 * Sắc độ của `<StatusChip>` — lấy đúng 6 kiểu chip ở artboard `Main` ("Trạng thái hồ sơ").
 * `bg` là nền nhạt, `dot` là chấm tròn, `text` là màu chữ.
 */
export const STATUS_TONES = {
  neutral: { bg: COLORS.fill, dot: COLORS.textMuted, text: COLORS.textSecondary },
  brand: { bg: "#0E7A5F14", dot: COLORS.primary, text: COLORS.primary },
  interview: { bg: "#8A2BE214", dot: COLORS.interview, text: COLORS.textPrimary },
  warning: { bg: "#FF75001A", dot: COLORS.warning, text: COLORS.textPrimary },
  success: { bg: "#00CB871F", dot: COLORS.success, text: COLORS.textPrimary },
  danger: { bg: "#FA2A2D14", dot: COLORS.error, text: COLORS.textPrimary },
} as const;

export type StatusTone = keyof typeof STATUS_TONES;
