/**
 * Port 1-1 từ `frontend/src/app/theme.ts` (COLORS).
 * Giữ NGUYÊN tên biến của web để đối chiếu hai codebase không phải dịch trong đầu.
 * Web đổi màu → sửa ở đây, đừng rải hex ra màn hình.
 *
 * App chỉ có giao diện sáng, giống web (`body { background: #F0F2F5 }`, không có dark mode).
 */
export const COLORS = {
  /* Thương hiệu */
  primary: "#0E7A5F",
  primaryLight: "#10B981",
  primaryDark: "#065F46",
  accent: "#D9F99D",
  accentWarm: "#FBBF24",

  /* Bề mặt */
  header: "#0B3B36",
  body: "#F0F2F5",
  cardBg: "#FFFFFF",

  /* Ngữ nghĩa */
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#3B82F6",

  /* Chữ */
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnDark: "#F9FAFB",

  /* Viền */
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  divider: "#E5E7EB",

  /* Màu theo giai đoạn tuyển dụng — dùng cho StatusChip ở ngày 3 */
  stageNew: "#3B82F6",
  stageScreening: "#8B5CF6",
  stageInterview: "#F59E0B",
  stageOffer: "#10B981",
  stageHired: "#22C55E",
  stageRejected: "#EF4444",
} as const;

/**
 * Web dùng `linear-gradient` ở hero và nút. Mobile KHÔNG có gradient:
 * `expo-linear-gradient` là native module, thêm vào là phải build lại dev build 10–30 phút.
 * Thay bằng màu đặc `header` — web cũng ẩn hẳn hero ở màn hẹp (`@media max-width: 768px`)
 * nên khác biệt này không nhìn thấy được.
 */
export const SURFACE_ON_DARK = COLORS.header;
