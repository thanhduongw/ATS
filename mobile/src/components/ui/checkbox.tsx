import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import { Icon } from "./icon";

/**
 * Ô tích + nhãn (canvas N28, N34). Cả hàng bấm được, vùng chạm cao ≥ 44.
 * Dùng cho các xác nhận "Tôi đồng ý…" trước hành động không hoàn tác được.
 */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Icon name="check" size={SIZES.iconXs + SPACING.xxs} color={COLORS.textOnPrimary} strokeWidth={2} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, minHeight: SIZES.control },
  box: {
    width: SIZES.iconSm,
    height: SIZES.iconSm,
    borderRadius: RADIUS.xs,
    borderWidth: SIZES.track,
    borderColor: COLORS.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  label: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
});
