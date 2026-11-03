import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  AI_GRADIENT_STOPS, COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING, STATUS_TONES, type StatusTone,
} from "@/theme";

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

/**
 * Điểm AI (DS01, DS05 "Thẻ ứng viên"): số trắng trên dải màu AI. Chỉ dùng cho nội bộ —
 * ứng viên không bao giờ thấy điểm AI (DS06). Gradient vẽ bằng react-native-svg (quyết định X5),
 * không thêm `expo-linear-gradient`.
 */
export function AiScoreBadge({ score, suffix }: { score: number; suffix?: string }) {
  const text = suffix ? `${score} ${suffix}` : String(score);
  // Ước lượng bề ngang theo số ký tự để SVG phủ kín viên thuốc.
  const width = Math.max(SIZES.tag + SPACING.xs, text.length * 7 + SPACING.sm * 2);
  return (
    <View style={[aiStyles.wrap, { width }]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={SIZES.tag}>
        <Defs>
          <LinearGradient id="ai" x1="0" y1="0" x2="1" y2="1">
            {AI_GRADIENT_STOPS.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={SIZES.tag} rx={SIZES.tag / 2} fill="url(#ai)" />
      </Svg>
      <Text style={aiStyles.label} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const aiStyles = StyleSheet.create({
  wrap: {
    height: SIZES.tag,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  label: { fontFamily: FONT.bold, fontSize: FONT_SIZE.xs, color: COLORS.textOnPrimary },
});
