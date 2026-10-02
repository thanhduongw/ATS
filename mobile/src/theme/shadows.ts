/**
 * Canvas gần như không dùng bóng: thẻ trắng nổi lên nhờ nền xám, không nhờ đổ bóng.
 * Chuỗi `boxShadow` — React Native 0.76+ hiểu thẳng, không dùng shadowOffset/elevation.
 */
export const SHADOWS = {
  /** Ô đang chọn trong segmented control (canvas M10). */
  raised: "0px 1px 4px rgba(0, 0, 0, 0.10)",
} as const;
