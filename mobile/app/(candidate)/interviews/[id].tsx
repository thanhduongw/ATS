import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyInterviews } from "@/features/interviews/hooks";
import { InterviewAction, interviewPlace } from "@/features/interviews/interview-actions";
import { awaitsReply } from "@/features/interviews/rules";
import { useApplicationsById } from "@/features/applications/hooks";
import { useWorkLocationNames } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, Divider, Eyebrow, IconTile, KeyValueRow } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { interviewStatus } from "@/lib/status";
import { formatLongDate, formatTime } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateInterview } from "@/types/api";

const S = STRINGS.interviewDetail;

/**
 * Chi tiết lịch phỏng vấn — Redesign-Final `views.interviewDetail`. Mở từ thông báo loại INTERVIEW hoặc từ mục
 * "Phỏng vấn" trong chi tiết đơn. Không có endpoint xem một buổi cho ứng viên → tìm trong `GET /interview/interviews/my`.
 * Tên vị trí ghép từ đơn ứng tuyển (buổi PV không có tên vị trí).
 */
export default function InterviewDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const query = useMyInterviews();
  const apps = useApplicationsById();
  const insets = useSafeAreaInsets();
  const interview = query.data?.find((iv) => iv.id === id);

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.title} />
      {query.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : query.isError && !query.data ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(query.error, "")} onRetry={() => void query.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {interview ? (
            <Body
              interview={interview}
              jobTitle={(interview.applicationId != null && apps.get(interview.applicationId)?.jobTitle) || ""}
            />
          ) : (
            <EmptyState
              icon="calendar"
              title={S.notFoundTitle}
              message={S.notFoundMessage}
              action={{ label: S.toApplications, onPress: () => router.navigate("/applications") }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Body({ interview, jobTitle }: { interview: CandidateInterview; jobTitle: string }) {
  const now = useNow();
  const notify = useSnackbar();
  const locations = useWorkLocationNames();
  const online = interview.format === "ONLINE";
  const waiting = awaitsReply(interview, now);
  const names = interview.interviewerNames?.filter(Boolean).join(", ");
  const link = online ? interview.meetingLink : undefined;

  return (
    <>
      <Card>
        <Eyebrow tone="brand">{formatLongDate(interview.scheduledAt)}</Eyebrow>
        <Text style={styles.title} accessibilityRole="header">
          {jobTitle || STRINGS.interviews.jobFallback}
        </Text>
        <View style={styles.when}>
          <IconTile icon="calendar" size={SIZES.iconButton} />
          <View style={styles.flex}>
            <Text style={styles.whenTitle}>
              {S.timeAndLength(formatTime(interview.scheduledAt), interview.durationMinutes ?? 60)}
            </Text>
            <Text style={styles.sub}>{online ? S.online : S.offline}</Text>
          </View>
          <StatusChip {...interviewStatus(interview.status, "CANDIDATE")} />
        </View>
        <Divider />
        <View>
          <KeyValueRow label={S.format} value={online ? S.formatOnline : S.formatOffline} />
          {!online ? <KeyValueRow label={S.place} value={interviewPlace(interview, locations)} /> : null}
          <KeyValueRow label={S.interviewers} value={names || S.tbd} last={!link} />
          {link ? (
            <KeyValueRow
              label={S.link}
              last
              value={
                <PillButton
                  label={S.openLink}
                  variant="text"
                  size="sm"
                  iconRight="arrowRight"
                  onPress={() =>
                    Linking.openURL(link).catch(() => notify(STRINGS.interviews.meetingFailed))
                  }
                />
              }
            />
          ) : null}
        </View>
        {interview.status === "CANDIDATE_DECLINED" && interview.candidateDeclineReason ? (
          <Text style={styles.sub}>{STRINGS.interviews.decline.yourReason(interview.candidateDeclineReason)}</Text>
        ) : null}
      </Card>

      {waiting ? (
        // `.card` nền phớt màu thương hiệu: việc cần làm ngay.
        <View style={styles.reply}>
          <Text style={styles.replyTitle}>{S.confirmTitle}</Text>
          <Text style={styles.sub}>{S.confirmBody}</Text>
          <InterviewAction interview={interview} size="md" fullWidth />
        </View>
      ) : (
        <InterviewAction interview={interview} size="md" fullWidth />
      )}

      {interview.applicationId != null ? (
        <PillButton
          label={S.viewApplication}
          variant="outline"
          fullWidth
          onPress={() =>
            router.push({ pathname: "/applications/[id]", params: { id: String(interview.applicationId) } })
          }
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },
  title: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    lineHeight: FONT_SIZE.h3 * LINE_HEIGHT.title,
    color: COLORS.textPrimary,
  },
  when: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  whenTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  reply: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: SIZES.border,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryFaint,
  },
  replyTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.base, color: COLORS.primaryDark },
});
