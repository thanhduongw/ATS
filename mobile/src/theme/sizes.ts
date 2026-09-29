/**
 * Kích thước điều khiển. Canvas vẽ nút và ô nhập cao 40; mobile nâng lên 44 để đạt vùng
 * chạm tối thiểu — đã chốt, đừng hạ lại.
 */
export const SIZES = {
  /** Nút chính, nút phụ, ô nhập một dòng. */
  control: 44,
  /** Nút tròn chỉ có icon (quay lại, thông báo). */
  iconButton: 40,
  /** Phần nội dung thanh tab dưới (chưa tính đáy an toàn) — canvas 56. */
  tabBar: 56,
  /** Chip lọc, nút nhỏ trong thẻ. */
  chip: 32,
  /** Chip trạng thái, tag. */
  tag: 24,
  /** Ô icon đầu dòng trong thẻ danh sách. */
  iconTile: 44,
  /** Ô OTP. */
  otpWidth: 48,
  otpHeight: 56,
  /** Icon trong ô nhập, trong nút. */
  iconSm: 20,
  /** Icon thanh tab. */
  icon: 24,
  /** Chấm màu trong chip trạng thái. */
  dot: 6,
  /** Nắm kéo của bottom sheet. */
  sheetHandleWidth: 40,
  sheetHandleHeight: 4,
  hairline: 0.5,
} as const;
