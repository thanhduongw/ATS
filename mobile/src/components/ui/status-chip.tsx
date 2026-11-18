import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Icon, type IconName } from "./icon";
import {
  AI_GRADIENT_STOPS, COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING, STATUS_TONES, type StatusTone,
} from "@/theme";

/**
 * Nhãn trạng thái của Redesign-Final (`.pill`): chữ đậm trên nền nhạt cùng sắc, bo 6, không chấm.
 * Không tự chọn tone ở màn hình — lấy từ `src/lib/status.ts`.
 */
export function StatusChip({ label, tone }: { label: string; tone: StatusTone }) {
  const t = STATUS_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Nhãn màu không chấm (UC01, UC02: phòng ban xanh, "Tuyển gấp" đỏ, "✓ Đã ứng tuyển" xanh lá) — dùng tông của
 * STATUS_TONES nhưng không phải trạng thái enum, nên màn tự chọn tone.
 */
export function ToneTag({ label, tone, icon }: { label: string; tone: StatusTone; icon?: IconName }) {
  const t = STATUS_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={SIZES.iconXs} color={t.text} strokeWidth={2} /> : null}
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Tag trung tính (hình thức làm việc, hạn nộp) — `.jobtags span`: nền xám rất nhạt, chữ phụ. */
export function Tag({ label }: { label: string }) {
  return (
    <View style={[styles.chip, styles.tag]}>
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
    gap: SPACING.xs,
    height: SIZES.tag,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.tag,
  },
  label: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.xs },
  tag: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.xs },
  tagLabel: { fontFamily: FONT.regular, color: COLORS.textSecondary },
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
