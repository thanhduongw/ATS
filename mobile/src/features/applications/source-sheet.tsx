import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { useRecruitmentSources } from "@/features/masterdata/hooks";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";

const S = STRINGS.jobDetail;

/**
 * Sheet chọn nguồn tuyển dụng ("Bạn biết tin này từ đâu?") — `recruitmentSourceId` là trường
 * BẮT BUỘC khi nộp đơn (@NotNull ở ApplicationCreateRequest). Chọn xong là đóng sheet.
 */
export function SourceSheet({
  visible,
  onDismiss,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onDismiss: () => void;
  selectedId?: number;
  onSelect: (id: number, name: string) => void;
}) {
  const sources = useRecruitmentSources();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={S.sourceSheetTitle} subtitle={S.sourceSheetSubtitle}>
      {sources.isPending ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : sources.isError ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{S.sourcesError}</Text>
          <PillButton label={STRINGS.common.retry} icon="refresh" variant="tonal" onPress={() => void sources.refetch()} />
        </View>
      ) : (
        <View accessibilityRole="radiogroup">
          {sources.data.map((s, i) => {
            const selected = s.id === selectedId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => onSelect(s.id!, s.name ?? "")}
                style={({ pressed }) => [
                  styles.row,
                  i < sources.data.length - 1 && styles.divider,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.label, selected && styles.labelSelected]}>{s.name}</Text>
                {selected ? <Icon name="check" size={SIZES.iconSm} color={COLORS.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </BottomSheet>
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
