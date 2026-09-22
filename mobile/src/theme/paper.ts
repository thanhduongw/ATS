import { MD3LightTheme, configureFonts, type MD3Theme } from "react-native-paper";
import { COLORS } from "./colors";
import { FONT } from "./typography";
import { RADIUS } from "./radius";

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
 * Theme Paper dựng từ token của web (`frontend/src/app/theme.ts`).
 * Đây là nơi DUY NHẤT nối token vào Paper — màn hình không tự đặt màu.
 *
 * Paper tính bo góc bằng `roundness`: Card dùng `roundness * 3`. Web để Card ở
 * RADIUS.lg = 12, nên roundness = 4 cho ra đúng 12.
 */
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: RADIUS.lg / 3,
  fonts,
  colors: {
    ...MD3LightTheme.colors,

    primary: COLORS.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: "rgba(14, 122, 95, 0.08)",
    onPrimaryContainer: COLORS.primaryDark,

    secondary: COLORS.primaryLight,
    onSecondary: "#FFFFFF",
    secondaryContainer: "rgba(16, 185, 129, 0.12)",
    onSecondaryContainer: COLORS.primaryDark,

    tertiary: COLORS.info,

    error: COLORS.error,
    onError: "#FFFFFF",
    errorContainer: "rgba(220, 38, 38, 0.10)",

    background: COLORS.body,
    onBackground: COLORS.textPrimary,

    surface: COLORS.cardBg,
    onSurface: COLORS.textPrimary,
    surfaceVariant: COLORS.borderLight,
    onSurfaceVariant: COLORS.textSecondary,
    surfaceDisabled: "rgba(17, 24, 39, 0.08)",
    onSurfaceDisabled: COLORS.textMuted,

    outline: COLORS.border,
    outlineVariant: COLORS.borderLight,

    inverseSurface: COLORS.header,
    backdrop: "rgba(17, 24, 39, 0.4)",
  },
};
