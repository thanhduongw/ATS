/**
 * Bo góc theo `docs/UI/ATS-Candidate-Mobile-Redesign-Final.html` (lớp `natural-redesign-overrides`, chốt 19/11/2026):
 * thẻ bo 15, nút và ô nhập bo 10, nhãn trạng thái bo 6, chip lọc dạng viên nhộng.
 */
export const RADIUS = {
  /** Ô tích (checkbox), nhãn phụ trong thẻ việc làm. */
  xs: 4,
  /** Nhãn trạng thái (`StatusChip`, `Tag`) — `.pill` bo 6. */
  tag: 6,
  /** Logo chữ ở thanh trên cùng, nút nhỏ. */
  sm: 8,
  /** Nút, ô nhập, ô tìm kiếm, nút icon vuông — `.btn`, `.input` bo 10. */
  control: 10,
  /** Ô icon đầu dòng, ô thông tin lồng trong thẻ. */
  md: 12,
  /** Khối đầu thẻ chi tiết, thông báo, ô OTP. */
  lg: 14,
  /** Thẻ (`.card` bo 15). */
  xl: 15,
  /** Khối màu lớn ở Trang chủ (`.hero` bo 16). */
  hero: 16,
  /** Mép trên của bottom sheet. */
  sheet: 24,
  full: 9999,
} as const;
