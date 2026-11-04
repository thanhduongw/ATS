import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/ui/avatar";
import { AiScoreBadge, StatusChip } from "@/components/ui/status-chip";
import { Card } from "@/components/ui/surfaces";
import { fixedStageView } from "@/lib/stages";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import type { ApplicationResponse } from "@/types/api";
import type { StaffArea } from "./tasks";

/**
 * Thẻ ứng viên (DS05, canvas UR02/UR15/UR18/UH02): chữ cái đầu · tên + điểm AI · chip giai đoạn ·
 * việc làm · một dòng trạng thái việc cần làm.
 */
export function CandidateCard({
  app,
  note,
  area,
}: {
  app: ApplicationResponse;
  note?: string;
  area: StaffArea;
}) {
  const open = () =>
    app.id != null &&
    router.push({
      pathname: `/${area}/applications/[id]`,
      params: { id: String(app.id) },
    });
  return (
    <Card onPress={open} accessibilityLabel={app.candidateName}>
      <View style={styles.row}>
        <Avatar name={app.candidateName} />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {app.candidateName}
            </Text>
            {app.aiScore != null ? (
              <AiScoreBadge score={Math.round(app.aiScore)} />
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <StatusChip {...fixedStageView(app.currentStageType)} />
            <Text style={styles.job} numberOfLines={1}>
              {app.jobTitle}
            </Text>
          </View>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACING.sm2 },
  body: { flex: 1, gap: SPACING.xs + SPACING.xxs },
  nameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  name: {
    flexShrink: 1,
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  job: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
  },
  note: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.caption,
    color: COLORS.primaryDark,
  },
});
