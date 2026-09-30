import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, FONT, FONT_SIZE, RADIUS, SHADOWS, SIZES, SPACING } from "@/theme";
import { STRINGS } from "@/lib/strings";
import { Icon } from "./icon";

/**
 * Ô tìm kiếm của canvas (M06, M16). Đây là bộ lọc tại chỗ, không phải form gửi đi,
 * nên giá trị do màn hình giữ (useState) — không vi phạm quy tắc 5.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={SIZES.iconSm} color={COLORS.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        selectionColor={COLORS.primary}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.common.clearSearch}
          onPress={() => onChangeText("")}
          hitSlop={SPACING.sm2}
        >
          <Icon name="close" size={SIZES.iconSm} color={COLORS.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export type ChipOption<K extends string> = { key: K; label: string; count?: number };

/** Hàng chip lọc cuộn ngang (canvas M06, M08). Chip đang chọn nền màu chính. */
export function FilterChips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      // Cho hàng chip tràn ra sát mép màn như canvas, trong khi phần còn lại có lề.
      style={styles.chipScroller}
    >
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            hitSlop={{ top: (SIZES.control - SIZES.chip) / 2, bottom: (SIZES.control - SIZES.chip) / 2 }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{o.label}</Text>
            {o.count != null ? (
              <Text style={[styles.chipCount, selected && styles.chipLabelSelected]}>{o.count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Segmented control của canvas (M10: Sắp tới / Đã qua). Dùng khi 2–3 lựa chọn loại trừ nhau. */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            style={[styles.segmentItem, selected && styles.segmentItemSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    height: SIZES.control,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },

  chipScroller: { marginHorizontal: -SPACING.page, flexGrow: 0 },
  chipRow: { gap: SPACING.sm, paddingHorizontal: SPACING.page },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs + SPACING.xxs,
    height: SIZES.chip,
    paddingHorizontal: SPACING.sm2 + SPACING.xxs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill,
  },
  chipSelected: { backgroundColor: COLORS.primary },
  chipLabel: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  chipCount: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  chipLabelSelected: { color: COLORS.textOnPrimary },

  segment: {
    flexDirection: "row",
    gap: SPACING.xxs,
    padding: SPACING.xxs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill,
  },
  segmentItem: {
    flex: 1,
    // Canvas vẽ 32; nâng lên 40 để cả khối đạt 44 vùng chạm.
    height: SIZES.iconButton,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  segmentItemSelected: { backgroundColor: COLORS.cardBg, boxShadow: SHADOWS.raised },
  segmentLabel: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  segmentLabelSelected: { color: COLORS.textPrimary },
});
