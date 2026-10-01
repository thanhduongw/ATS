import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { PillButton } from "./buttons";
import { Icon } from "./icon";

export type RadioOption = { id: number; label: string };

/**
 * Danh sách chọn một, mỗi dòng cao ≥ 52 kèm dấu tích ở dòng đang chọn. Dùng trong sheet
 * (nguồn tuyển dụng, lý do từ chối offer, trình độ học vấn). Nhận thẳng trạng thái tải của
 * masterdata để sheet nào cũng có loading/lỗi giống nhau.
 */
export function RadioList({
  options,
  value,
  onChange,
  loading,
  error,
  errorText,
  onRetry,
}: {
  options: readonly RadioOption[];
  value?: number;
  onChange: (id: number) => void;
  loading?: boolean;
  error?: boolean;
  errorText?: string;
  onRetry?: () => void;
}) {
  if (loading) return <ActivityIndicator color={COLORS.primary} style={styles.loading} />;
  if (error) {
    return (
      <View style={styles.error}>
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        {onRetry ? <PillButton label={STRINGS.common.retry} icon="refresh" variant="tonal" onPress={onRetry} /> : null}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(o.id)}
            style={({ pressed }) => [styles.row, i < options.length - 1 && styles.divider, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
            {selected ? <Icon name="check" size={SIZES.iconSm} color={COLORS.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: SPACING.xl },
  error: { alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.lg },
  errorText: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: SIZES.control + SPACING.sm,
    gap: SPACING.sm,
  },
  divider: { borderBottomWidth: SIZES.hairline, borderBottomColor: COLORS.divider },
  pressed: { backgroundColor: COLORS.fill },
  label: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  labelSelected: { fontFamily: FONT.medium, color: COLORS.primaryDark },
});
