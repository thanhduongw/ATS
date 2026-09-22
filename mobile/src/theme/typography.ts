import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from "@expo-google-fonts/be-vietnam-pro";

/**
 * Web nạp Be Vietnam Pro từ Google Fonts (`index.html`) với weight 400;500;600;700;800.
 * Mobile nạp cùng bộ chữ đó bằng expo-font lúc chạy — thuần asset, không phải build lại.
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

/** Cỡ chữ lấy đúng từ `atsTheme.token` của web. */
export const FONT_SIZE = {
  base: 14,
  lg: 16,
  h4: 16,
  h3: 20,
  h2: 24,
  h1: 30,
  caption: 13,
} as const;
