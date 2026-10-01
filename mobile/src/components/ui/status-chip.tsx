import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING, STATUS_TONES, type StatusTone } from "@/theme";

/**
 * Chip trạng thái của canvas: chấm màu + nhãn trên nền nhạt cùng sắc.
 * Không tự chọn tone ở màn hình — lấy từ `src/lib/status.ts`.
 */
export function StatusChip({ label, tone }: { label: string; tone: StatusTone }) {
  const t = STATUS_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Tag trung tính không có chấm (hình thức làm việc, địa điểm, phúc lợi). */
export function Tag({ label }: { label: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: STATUS_TONES.neutral.bg }]}>
      <Text style={[styles.label, styles.tagLabel]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    // Nhãn dài không được tràn khỏi thẻ: co lại và cắt "…" (Text đã numberOfLines={1}).
    maxWidth: "100%",
    flexShrink: 1,
    gap: SPACING.xs + SPACING.xxs,
    height: SIZES.tag,
    paddingHorizontal: SPACING.sm + SPACING.xxs,
    borderRadius: RADIUS.full,
  },
  dot: { width: SIZES.dot, height: SIZES.dot, borderRadius: RADIUS.full },
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs },
  tagLabel: { color: COLORS.textPrimary },
});
