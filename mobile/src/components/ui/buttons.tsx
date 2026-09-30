import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import { Icon, type IconName } from "./icon";

type Variant = "primary" | "tonal" | "danger" | "text";

const VARIANT: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: COLORS.primary, fg: COLORS.textOnPrimary },
  // Canvas để chữ #0E7A5F trên nền 10% — chỉ 4.4:1. Dùng primaryDark cho đạt 4.5:1.
  tonal: { bg: COLORS.fillStrong, fg: COLORS.primaryDark },
  // Canvas để chữ #FA2A2D trên nền 10% — 3.2:1. Dùng errorText.
  danger: { bg: COLORS.fillStrong, fg: COLORS.errorText },
  text: { bg: "transparent", fg: COLORS.primaryDark },
};

/**
 * Nút dạng viên nhộng của canvas. `md` cao 44 (nút chính của màn), `sm` cao 32 cho nút
 * trong thẻ — `sm` được nới vùng chạm bằng hitSlop cho đủ 44.
 */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
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
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANT[variant];
  const inactive = disabled || loading;
  const height = size === "md" ? SIZES.control : SIZES.chip;
  const slop = (SIZES.control - height) / 2;

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
          paddingHorizontal: variant === "text" ? SPACING.sm : size === "md" ? SPACING.md2 : SPACING.sm2,
        },
        fullWidth && styles.fullWidth,
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Icon name={icon} size={SIZES.iconSm} color={v.fg} />
      ) : null}
      <Text
        style={[styles.label, { color: v.fg, fontSize: size === "md" ? FONT_SIZE.lg : FONT_SIZE.base }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Nút tròn chỉ có icon (quay lại, thông báo, tải PDF). Bắt buộc có nhãn cho trình đọc màn hình. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = "fill",
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** `fill` trên nền trang; `surface` là nền trắng (nút thông báo ở header, canvas M06). */
  variant?: "fill" | "surface";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(SIZES.control - SIZES.iconButton) / 2}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: variant === "fill" ? COLORS.fill : COLORS.cardBg },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={SIZES.iconSm} color={COLORS.textPrimary} />
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
    borderRadius: RADIUS.full,
  },
  fullWidth: { alignSelf: "stretch" },
  label: { fontFamily: FONT.medium },
  // Một-lần: độ mờ khi nhấn/vô hiệu, không phải màu nên không thành token.
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  iconButton: {
    width: SIZES.iconButton,
    height: SIZES.iconButton,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
