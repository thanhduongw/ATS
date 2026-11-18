/**
 * Kích thước điều khiển theo Redesign-Final: nút và ô nhập cao 44 (cũng là vùng chạm tối thiểu — đừng hạ lại),
 * nút nhỏ cao 36.
 */
export const SIZES = {
  /** Nút phụ, ô nhập một dòng. */
  control: 44,
  /** Nút chính — Redesign-Final để mọi nút cùng cao 44 (nút đặt cạnh nhau không lệch). */
  primaryAction: 44,
  /** Nút nhỏ trong thẻ (`.btn.sm`). */
  buttonSm: 36,
  /** Nút vuông chỉ có icon (quay lại, chuông) — `.iconbtn` 36, nới lên 40. */
  iconButton: 40,
  /** Phần nội dung thanh tab dưới (chưa tính đáy an toàn). */
  tabBar: 56,
  /** Thanh trên cùng của khu ứng viên (`.appbar` 56). */
  appBar: 56,
  /** Logo công ty ở thanh trên cùng. */
  logo: 30,
  /** Chip lọc, nút nhỏ trong thẻ. */
  chip: 32,
  /** Chip trạng thái, tag. */
  tag: 24,
  /** Ô icon đầu dòng trong thẻ danh sách. */
  iconTile: 44,
  /** Ô OTP. */
  otpWidth: 48,
  otpHeight: 56,
  /** Icon nhỏ trong chấm tiến trình. */
  iconXs: 14,
  /** Icon trong ô nhập, trong nút. */
  iconSm: 20,
  /** Icon thanh tab. */
  icon: 24,
  /** Chấm màu trong chip trạng thái. */
  dot: 6,
  /** Nắm kéo của bottom sheet. */
  sheetHandleWidth: 40,
  sheetHandleHeight: 4,
  /** Đường kẻ giữa các dòng — Redesign-Final dùng nét 1px màu nhạt thay cho nét 0.5px đậm. */
  hairline: 1,
  /** Thanh tiến độ hoàn thiện hồ sơ (M13). */
  progress: 6,
  /** Đường nối giữa các chặng tiến trình (ngang M08, dọc M09). */
  track: 2,
  /** Viền thẻ, ô nhập, chip. */
  border: 1,
  /** Vạch màu bên trái thông báo chưa đọc. */
  accent: 3,
  /** Chấm dòng thời gian ở chi tiết đơn (`.step:before`). */
  stepDot: 10,
} as const;
