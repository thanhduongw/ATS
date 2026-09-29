import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from "@expo-google-fonts/be-vietnam-pro";

/**
 * Canvas dùng HarmonyOS Sans; mobile CỐ Ý giữ Be Vietnam Pro vì chắc chắn đủ dấu tiếng Việt.
 * Nạp bằng expo-font lúc chạy — thuần asset, không phải build lại.
 */
export const FONT_ASSETS = {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
};

/**
 * File font đã mang sẵn độ đậm, nên chọn độ đậm bằng TÊN FONT chứ không bằng `fontWeight`.
 * Đặt cả hai dễ khiến Android tự làm đậm thêm lần nữa (chữ bị dày bất thường).
 */
export const FONT = {
  regular: "BeVietnamPro_400Regular",
  medium: "BeVietnamPro_500Medium",
  semibold: "BeVietnamPro_600SemiBold",
  bold: "BeVietnamPro_700Bold",
} as const;

/** Thang cỡ chữ lấy từ canvas M01–M20. */
export const FONT_SIZE = {
  /** Nhãn thanh tab. */
  micro: 10,
  /** Chip trạng thái, tag, chú thích dưới ô nhập. */
  xs: 12,
  /** Dòng phụ trong thẻ (phòng ban, ngày nộp). */
  caption: 13,
  /** Cỡ nền: nhãn ô nhập, chip lọc, câu dẫn phụ. */
  base: 14,
  /** Tiêu đề dòng trong danh sách dày (lịch PV, thông báo). */
  md: 15,
  /** Chữ trong ô nhập, nút, tiêu đề thẻ. */
  lg: 16,
  /** Tiêu đề khối trong thẻ ("Tiến trình", "Chi tiết đề nghị"). */
  section: 18,
  /** Tiêu đề màn chi tiết (thanh gọn có nút quay lại), tiêu đề sheet. */
  h3: 20,
  /** Số OTP, lời chúc trong thư mời. */
  h2: 24,
  /** Tiêu đề lớn đầu màn. */
  h1: 30,
} as const;

/** Chiều cao dòng cho đoạn văn nhiều dòng (canvas `line-height: 1.45`). */
export const LINE_HEIGHT = {
  body: 1.45,
  title: 1.2,
} as const;
