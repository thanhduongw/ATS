import type { BottomTabNavigationOptions } from "expo-router/build/layouts/Tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";

/**
 * Cấu hình dùng chung cho cả 3 khu vực role, theo thanh tab của canvas: nền trang gần như
 * đục, kẻ mảnh phía trên, icon nét 24 và nhãn 10. Mục đang chọn đổi màu chính.
 *
 * Là HOOK vì phải cộng phần đáy an toàn (thanh điều hướng/vạch vuốt của hệ thống). Để
 * chiều cao cố định thì trên máy có thanh 3 nút, tab bị dính sát mép dưới.
 *
 * KHÔNG có thanh tiêu đề của navigator: mỗi màn tự vẽ `<ScreenHeader>`.
 */
export function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  // Canvas chừa 24 dưới thanh tab; máy có sẵn phần đáy an toàn thì cộng thêm một chút cho thoáng.
  const bottom = Math.max(insets.bottom + SPACING.sm, SPACING.lg);

  return {
    headerShown: false,

    // Bàn phím mở thì ẩn thanh tab: không thì Android đẩy thanh tab lên nằm trên bàn phím,
    // chiếm chỗ và làm nội dung bị dồn.
    tabBarHideOnKeyboard: true,

    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarStyle: {
      height: SIZES.tabBar + bottom,
      paddingTop: SPACING.xs + SPACING.xxs,
      paddingBottom: bottom,
      backgroundColor: COLORS.barBg,
      borderTopColor: COLORS.divider,
      borderTopWidth: SIZES.hairline,
      elevation: 0,
    },
    tabBarLabelStyle: { fontFamily: FONT.medium, fontSize: FONT_SIZE.micro },
    // Số đỏ trên tab (canvas N26). errorText thay cho error: chữ trắng 11px trên #FA2A2D chỉ 3.9:1.
    tabBarBadgeStyle: {
      backgroundColor: COLORS.errorText,
      color: COLORS.textOnPrimary,
      fontFamily: FONT.bold,
      fontSize: FONT_SIZE.micro,
    },

    sceneStyle: { backgroundColor: COLORS.body },
  };
}
