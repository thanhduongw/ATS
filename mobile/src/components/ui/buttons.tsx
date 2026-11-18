import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING, STATUS_TONES } from "@/theme";
import { Icon, type IconName } from "./icon";

type Variant = "primary" | "tonal" | "outline" | "danger" | "text";

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: COLORS.primary, fg: COLORS.textOnPrimary },
  // Redesign-Final `.btn.secondary`: nền nhạt của màu thương hiệu, chữ đậm hơn cho đủ tương phản.
  tonal: { bg: COLORS.primarySoft, fg: COLORS.primaryDark },
  // `.btn.ghost`: nền trắng, viền mảnh, chữ chính.
  outline: { bg: COLORS.cardBg, fg: COLORS.textPrimary, border: COLORS.border },
  // `.btn.danger`: nền đỏ nhạt, chữ đỏ đậm (errorText đạt 4.5:1).
  danger: { bg: STATUS_TONES.danger.bg, fg: COLORS.errorText },
  text: { bg: "transparent", fg: COLORS.primaryDark },
};

/**
 * Nút của app (tên giữ là PillButton cho khỏi đổi khắp nơi). Redesign-Final: bo 10, `md` cao 44 cho mọi kiểu
 * (hai nút đặt cạnh nhau luôn bằng nhau), `sm` cao 36 trong thẻ — `sm` được nới vùng chạm bằng hitSlop cho đủ 44.
 */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: "md" | "sm";
  icon?: IconName;
  /** Icon sau chữ ("Ứng tuyển ngay →"). */
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANT[variant];
  const inactive = disabled || loading;
  const height = size === "md" ? SIZES.primaryAction : variant === "text" ? SIZES.chip : SIZES.buttonSm;
  const slop = (SIZES.control - height) / 2;
  const iconSize = size === "md" ? SIZES.iconSm : SIZES.iconXs + SPACING.xxs;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      hitSlop={slop > 0 ? slop : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: v.bg,
          paddingHorizontal: variant === "text" ? SPACING.xs : size === "md" ? SPACING.md : SPACING.sm2,
        },
        v.border ? { borderWidth: SIZES.border, borderColor: v.border } : null,
        fullWidth && styles.fullWidth,
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Icon name={icon} size={iconSize} color={v.fg} strokeWidth={1.8} />
      ) : null}
      <Text
        style={[styles.label, { color: v.fg, fontSize: size === "md" ? FONT_SIZE.md : FONT_SIZE.caption }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} color={v.fg} strokeWidth={1.8} /> : null}
    </Pressable>
  );
}

/**
 * Nút vuông bo 10 chỉ có icon (quay lại, chuông, tải PDF) — Redesign-Final `.iconbtn`/`.backbtn`: nền trắng, viền mảnh.
 * Bắt buộc có nhãn cho trình đọc màn hình.
 */
export function IconButton({
  icon,
  label,
  onPress,
  variant = "surface",
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** `surface` nền trắng có viền (mặc định); `fill` nền xám nhạt không viền (đặt trên thẻ trắng). */
  variant?: "fill" | "surface";
  /** Số đỏ ở góc (số thông báo chưa đọc). 0/undefined → không hiện. */
  badge?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      onPress={onPress}
      hitSlop={(SIZES.control - SIZES.iconButton) / 2}
      style={({ pressed }) => [
        styles.iconButton,
        variant === "fill" ? styles.iconFill : styles.iconSurface,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={SIZES.iconSm} color={COLORS.textPrimary} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: SPACING.xs + SPACING.xxs,
    borderRadius: RADIUS.control,
  },
  fullWidth: { alignSelf: "stretch" },
  label: { fontFamily: FONT.semibold },
  // Một-lần: độ mờ khi nhấn/vô hiệu, không phải màu nên không thành token.
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  iconButton: {
    width: SIZES.iconButton,
    height: SIZES.iconButton,
    borderRadius: RADIUS.control,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSurface: { backgroundColor: COLORS.cardBg, borderWidth: SIZES.border, borderColor: COLORS.border },
  iconFill: { backgroundColor: COLORS.fill },
  badge: {
    position: "absolute",
    top: -SPACING.xs,
    right: -SPACING.xs,
    minWidth: SIZES.dot * 3,
    height: SIZES.dot * 3,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.full,
    // errorText chứ không phải error: chữ trắng 10px trên #FA2A2D chỉ đạt 3.9:1.
    backgroundColor: COLORS.errorText,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: FONT.bold, fontSize: FONT_SIZE.micro, color: COLORS.textOnPrimary },
});
