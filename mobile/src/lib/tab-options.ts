import type { BottomTabNavigationOptions } from "expo-router/build/layouts/Tabs";
import { COLORS, FONT, FONT_SIZE } from "@/theme";

/**
 * Cấu hình dùng chung cho cả 3 khu vực role, để tab bar và thanh tiêu đề của
 * CANDIDATE / HM / HR giống hệt nhau và giống bảng màu của web.
 *
 * Web dùng `Layout.headerBg = #0B3B36` cho thanh trên và `Menu.itemSelectedColor = primary`
 * cho mục đang chọn — ở đây ánh xạ đúng như vậy.
 */
export const sharedTabScreenOptions: BottomTabNavigationOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.header },
  headerTintColor: COLORS.textOnDark,
  headerTitleStyle: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.h4 },

  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.textMuted,
  tabBarStyle: {
    backgroundColor: COLORS.cardBg,
    borderTopColor: COLORS.border,
  },
  tabBarLabelStyle: { fontFamily: FONT.medium, fontSize: 12 },

  sceneStyle: { backgroundColor: COLORS.body },
};
