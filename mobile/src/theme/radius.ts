/**
 * Bo góc theo canvas — điều khiển dạng "viên nhộng": nút, ô nhập, chip đều bo bằng nửa
 * chiều cao, nên dùng `full` thay vì tự tính.
 */
export const RADIUS = {
  /** Chip nhỏ cao 24. */
  sm: 12,
  /** Ô icon 44, hộp thông tin lồng trong thẻ. */
  md: 14,
  /** Ô icon 48, ô OTP, ô ngày trong lịch. */
  lg: 16,
  /** Thẻ (`section`) và ô nhập nhiều dòng. */
  xl: 20,
  /** Mép trên của bottom sheet. */
  sheet: 32,
  full: 9999,
} as const;
