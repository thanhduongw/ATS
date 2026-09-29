import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { PillButton } from "./buttons";
import { IconTile } from "./surfaces";
import type { IconName } from "./icon";

/**
 * Khung xương lúc đang tải: các thẻ trắng có vạch xám nhấp nháy, cùng hình dáng với thẻ
 * thật để lúc dữ liệu về màn không nhảy bố cục.
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  // useState thay cho useRef: giá trị Animated được đọc trong lúc render.
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonList} accessibilityLabel={STRINGS.common.loading} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity: pulse }]}>
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonTile} />
            <View style={styles.skeletonLines}>
              <View style={[styles.bar, styles.barWide]} />
              <View style={[styles.bar, styles.barNarrow]} />
            </View>
          </View>
          <View style={[styles.bar, styles.barMid]} />
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * Trạng thái rỗng. Quy tắc 3: phải có câu DẪN VIỆC (người dùng nên làm gì tiếp), không chỉ
 * báo "không có dữ liệu". Có hành động thì truyền `action`.
 */
export function EmptyState({
  icon = "inbox",
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <IconTile icon={icon} shape="circle" size={SIZES.otpHeight + SPACING.sm} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <PillButton label={action.label} onPress={action.onPress} variant="tonal" style={styles.action} /> : null}
    </View>
  );
}

/** Trạng thái lỗi, luôn kèm nút thử lại (quy tắc 3). `message` lấy từ `apiErrorMessage()`. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <IconTile icon="alert" tone="danger" shape="circle" size={SIZES.otpHeight + SPACING.sm} />
      <Text style={styles.title}>{STRINGS.errorState.title}</Text>
      <Text style={styles.message}>{message || STRINGS.errorState.fallback}</Text>
      <PillButton label={STRINGS.common.retry} icon="refresh" onPress={onRetry} variant="tonal" style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonList: { gap: SPACING.sm2 },
  skeletonCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: SPACING.sm2,
  },
  skeletonRow: { flexDirection: "row", gap: SPACING.sm2, alignItems: "center" },
  skeletonTile: { width: SIZES.iconTile, height: SIZES.iconTile, borderRadius: RADIUS.md, backgroundColor: COLORS.fillStrong },
  skeletonLines: { flex: 1, gap: SPACING.sm },
  bar: { height: SPACING.sm2, borderRadius: RADIUS.full, backgroundColor: COLORS.fillStrong },
  // Một-lần: độ dài các vạch xương, chỉ để trông giống dòng chữ.
  barWide: { width: "80%" },
  barNarrow: { width: "45%" },
  barMid: { width: "60%" },

  center: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    marginTop: SPACING.sm,
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.section,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  message: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  action: { alignSelf: "center", marginTop: SPACING.sm },
});
