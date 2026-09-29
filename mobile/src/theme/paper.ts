import { MD3LightTheme, configureFonts, type MD3Theme } from "react-native-paper";
import { COLORS, STATUS_TONES } from "./colors";
import { FONT } from "./typography";

/**
 * Ánh xạ độ đậm của MD3 sang đúng file font Be Vietnam Pro.
 * Trả `fontWeight: "normal"` vì tên font đã mang độ đậm rồi.
 */
const weightToFamily = (weight?: string): string => {
  switch (weight) {
    case "700":
    case "bold":
      return FONT.bold;
    case "600":
      return FONT.semibold;
    case "500":
      return FONT.medium;
    default:
      return FONT.regular;
  }
};

const fonts = configureFonts({
  config: Object.fromEntries(
    Object.entries(MD3LightTheme.fonts).map(([variant, style]) => [
      variant,
      { ...style, fontFamily: weightToFamily(style.fontWeight), fontWeight: "normal" as const },
    ])
  ),
});

/**
 * Theme Paper dựng từ token của canvas. Đây là nơi DUY NHẤT nối token vào Paper — màn hình
 * không tự đặt màu.
 *
 * Nút, ô nhập, chip của app đã có component riêng trong `src/components/ui/` (dạng viên
 * nhộng theo canvas). Paper chỉ còn lo Snackbar, Modal/Portal, ActivityIndicator, Switch…
 * nên chỉ cần màu đúng. `roundness = 4` → nút Paper (nếu còn sót) bo 20, gần viên nhộng.
 */
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  fonts,
  colors: {
    ...MD3LightTheme.colors,

    primary: COLORS.primary,
    onPrimary: COLORS.textOnPrimary,
    primaryContainer: COLORS.primarySoft,
    onPrimaryContainer: COLORS.primaryDark,

    secondary: COLORS.primaryDark,
    onSecondary: COLORS.textOnPrimary,
    secondaryContainer: COLORS.fillStrong,
    onSecondaryContainer: COLORS.primaryDark,

    tertiary: COLORS.interview,

    error: COLORS.error,
    onError: COLORS.textOnPrimary,
    errorContainer: STATUS_TONES.danger.bg,
    onErrorContainer: COLORS.errorText,

    background: COLORS.body,
    onBackground: COLORS.textPrimary,

    surface: COLORS.cardBg,
    onSurface: COLORS.textPrimary,
    surfaceVariant: COLORS.fill,
    onSurfaceVariant: COLORS.textSecondary,
    surfaceDisabled: COLORS.fill,
    onSurfaceDisabled: COLORS.textMuted,

    outline: COLORS.divider,
    outlineVariant: COLORS.divider,

    // Snackbar dùng inverseSurface làm nền: chữ tối của canvas làm nền, chữ trắng ở trên.
    inverseSurface: COLORS.textPrimary,
    inverseOnSurface: COLORS.textOnPrimary,
    inversePrimary: COLORS.success,
    backdrop: COLORS.backdrop,
  },
};
