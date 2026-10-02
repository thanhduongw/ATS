import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { IconButton } from "./buttons";

/**
 * Tiêu đề đầu màn theo canvas — thay cho thanh tiêu đề tối cũ.
 *
 * - `large` (màn tab, danh sách): tiêu đề 30 đậm và các nút (chuông, quay lại) nằm CÙNG MỘT
 *   HÀNG — nút quay lại bên trái, tiêu đề, nút hành động bên phải; câu dẫn tùy chọn ở dưới.
 *   (Canvas để hàng nút riêng phía trên tiêu đề; đã đổi theo yêu cầu cho gọn đầu màn.)
 * - `compact` (màn chi tiết): nút quay lại + tiêu đề 20 trên cùng một hàng. Canvas M09, M12.
 *
 * Tự cộng khoảng tai thỏ/thanh trạng thái, nên màn hình KHÔNG bọc thêm SafeAreaView ở trên.
 */
export function ScreenHeader({
  title,
  subtitle,
  variant = "large",
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  variant?: "large" | "compact";
  /** `true` → quay lại màn trước; hàm → tự xử lý. Bỏ trống → không có nút quay lại. */
  back?: boolean | (() => void);
  actions?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const onBack = typeof back === "function" ? back : () => router.back();
  const backButton = back ? <IconButton icon="back" label={STRINGS.common.back} onPress={onBack} /> : null;

  if (variant === "compact") {
    return (
      <View style={[styles.compact, { paddingTop: insets.top + SPACING.sm2 }]}>
        {backButton}
        <Text style={styles.compactTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.large, { paddingTop: insets.top + SPACING.sm2 }]}>
      <View style={styles.topRow}>
        {backButton}
        <Text style={styles.largeTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/**
 * Thanh hành động dính đáy màn chi tiết (canvas M12: Từ chối / Nhận việc). Màn dùng nó phải
 * chừa `paddingBottom` cho nội dung cuộn bằng `BOTTOM_BAR_SPACE` để khỏi bị che.
 */
export function BottomActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.sm2 }]}>
      {children}
    </View>
  );
}

/** Khoảng trống cần chừa ở cuối nội dung cuộn khi có `BottomActionBar` (chưa tính safe-area). */
export const BOTTOM_BAR_SPACE = SIZES.control + SPACING.sm2 * 2 + SPACING.md;

const styles = StyleSheet.create({
  large: {
    gap: SPACING.xs,
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.sm2,
    backgroundColor: COLORS.body,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, minHeight: SIZES.control },
  actions: { flexDirection: "row", gap: SPACING.sm },
  largeTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h1,
    lineHeight: FONT_SIZE.h1 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  subtitle: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },

  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
    paddingHorizontal: SPACING.page,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.body,
  },
  compactTitle: { flex: 1, fontFamily: FONT.bold, fontSize: FONT_SIZE.h3, color: COLORS.textPrimary },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: SPACING.sm2,
    paddingTop: SPACING.sm2,
    paddingHorizontal: SPACING.page,
    backgroundColor: COLORS.barBg,
    borderTopWidth: SIZES.hairline,
    borderTopColor: COLORS.divider,
  },
});
