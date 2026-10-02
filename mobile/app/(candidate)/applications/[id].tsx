import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyApplication } from "@/features/applications/hooks";
import { useMyInterviews, useMyPendingSlots } from "@/features/interviews/hooks";
import { InterviewAction, interviewPlace } from "@/features/interviews/interview-actions";
import { useMyOffers } from "@/features/offers/hooks";
import { useWorkLocationNames } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, CardTitle, IconTile, ListRow } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { applicationPhase, interviewStatus, offerStatus, stageStatus } from "@/lib/status";
import { formatDate, formatLongDate, formatTimeRange } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateApplication, CandidateInterview } from "@/types/api";

const S = STRINGS.applicationDetail;
const P = STRINGS.applications.timeline;

/** M09 — Chi tiết đơn (B4): tiến trình, lịch phỏng vấn, thư mời của đơn này. */
export default function ApplicationDetailScreen() {
  const now = useNow();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const app = useMyApplication(id);
  const interviews = useMyInterviews();
  const offers = useMyOffers();
  const slots = useMyPendingSlots();
  const locations = useWorkLocationNames();
  const insets = useSafeAreaInsets();

  const refetchAll = () => {
    void app.refetch();
    void interviews.refetch();
    void offers.refetch();
    void slots.refetch();
  };
  const mySlots = (slots.data ?? []).filter((sl) => sl.applicationId === id);

  // Buổi PV của đơn này: ưu tiên buổi sắp tới gần nhất, không có thì buổi gần đây nhất.
  const mine = (interviews.data ?? [])
    .filter((iv) => iv.applicationId === id && iv.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const interview: CandidateInterview | undefined =
    mine.find((iv) => new Date(iv.scheduledAt!).getTime() >= now) ?? mine[mine.length - 1];
  const offer = (offers.data ?? []).find((o) => o.applicationId === id);

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={app.data?.jobTitle ?? S.title} />
      {app.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : app.isError ? (
        <ErrorState message={apiErrorMessage(app.error, "")} onRetry={() => void app.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]}
          refreshControl={
            <RefreshControl
              refreshing={app.isRefetching}
              onRefresh={refetchAll}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Việc cần làm ngay lên đầu (canvas N30). */}
          {mySlots.length ? (
            <Card style={styles.actionCard}>
              <Text style={styles.actionTitle}>{S.slotInvite(mySlots.length)}</Text>
              <PillButton
                label={S.pickInterviewTime}
                icon="calendar"
                fullWidth
                onPress={() =>
                  router.push({ pathname: "/interviews/schedule", params: { applicationId: String(id) } })
                }
              />
            </Card>
          ) : interview?.status === "HM_CONFIRMED" ? (
            <Card style={styles.actionCard}>
              <Text style={styles.actionTitle}>{S.confirmInvite}</Text>
              <Text style={styles.sub}>
                {formatLongDate(interview.scheduledAt)} · {formatTimeRange(interview.scheduledAt, interview.durationMinutes)}
              </Text>
              <InterviewAction interview={interview} size="md" fullWidth />
            </Card>
          ) : null}

          <SummaryCard app={app.data} />
          <ProgressCard app={app.data} interview={interview} />

          {interview ? (
            <Card>
              <CardTitle right={<StatusChip {...interviewStatus(interview.status, "CANDIDATE")} />}>
                {S.interview}
              </CardTitle>
              <ListRow
                icon="clock"
                title={formatLongDate(interview.scheduledAt)}
                subtitle={formatTimeRange(interview.scheduledAt, interview.durationMinutes)}
              />
              <ListRow icon={interview.format === "ONLINE" ? "video" : "home"} title={interviewPlace(interview, locations)} last />
              {/* Nút xác nhận đã nằm ở thẻ hành động trên cùng — không lặp lại ở đây. */}
              {interview.status !== "HM_CONFIRMED" ? <InterviewAction interview={interview} size="md" fullWidth /> : null}
            </Card>
          ) : null}

          {offer ? (
            <Card>
              <CardTitle right={<StatusChip {...offerStatus(offer.status, "CANDIDATE")} />}>{S.offer}</CardTitle>
              <PillButton
                label={S.viewOffer}
                fullWidth
                onPress={() => router.push({ pathname: "/offers/[id]", params: { id: String(offer.id) } })}
              />
            </Card>
          ) : null}

          {app.data.jobPostingId != null ? (
            <PillButton
              label={S.viewJob}
              variant="tonal"
              fullWidth
              onPress={() =>
                router.push({ pathname: "/jobs/[id]", params: { id: String(app.data.jobPostingId) } })
              }
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryCard({ app }: { app: CandidateApplication }) {
  return (
    <Card>
      <View style={styles.summaryHead}>
        <IconTile icon="briefcase" size={SIZES.otpWidth} />
        <View style={styles.flex}>
          <Text style={styles.jobTitle}>{app.jobTitle}</Text>
          {app.departmentName ? <Text style={styles.sub}>{app.departmentName}</Text> : null}
        </View>
      </View>
      <View style={styles.summaryFoot}>
        <StatusChip {...stageStatus(app.currentStageType, app.currentStageName)} />
        <Text style={styles.sub}>{STRINGS.applications.appliedOn(formatDate(app.appliedAt))}</Text>
      </View>
    </Card>
  );
}

/**
 * Dòng thời gian dọc 4 chặng (canvas M09). Backend chỉ trả vòng hiện tại, không có ngày của
 * từng vòng → chặng đã qua ghi "Đã qua", chặng đầu ghi ngày nộp.
 */
function ProgressCard({ app, interview }: { app: CandidateApplication; interview?: CandidateInterview }) {
  const phase = applicationPhase(app.currentStageType);

  type Item = { title: string; subtitle: string; state: "done" | "current" | "upcoming" | "stopped" };
  const items: Item[] = phase.rejected
    ? [
        { title: P[0]!, subtitle: formatDate(app.appliedAt), state: "done" },
        {
          title: S.rejectedTitle,
          subtitle: app.rejectionReasonName ?? app.currentStageName ?? "",
          state: "stopped",
        },
      ]
    : P.map((title, i) => {
        const done = i < phase.step || phase.hired;
        const current = i === phase.step && !phase.hired;
        let subtitle: string = done ? S.stepDone : current ? S.stepCurrent : S.stepUpcoming;
        if (i === 0) subtitle = formatDate(app.appliedAt);
        else if (current && app.currentStageName) subtitle = app.currentStageName;
        if (current && i === 2 && interview?.scheduledAt)
          subtitle = `${formatDate(interview.scheduledAt)} · ${formatTimeRange(interview.scheduledAt, interview.durationMinutes)}`;
        return {
          title: phase.hired && i === P.length - 1 ? S.hiredTitle : title,
          subtitle,
          state: done ? "done" : current ? "current" : "upcoming",
        } as Item;
      });

  return (
    <Card>
      <CardTitle>{S.progress}</CardTitle>
      <View>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <View key={i} style={styles.tlRow}>
              <View style={styles.tlRail}>
                <View
                  style={[
                    styles.tlDot,
                    it.state === "done" && styles.tlDotDone,
                    it.state === "current" && styles.tlDotCurrent,
                    it.state === "stopped" && styles.tlDotStopped,
                  ]}
                >
                  {it.state === "done" ? (
                    <Icon name="check" size={SIZES.iconXs} color={COLORS.textOnPrimary} strokeWidth={2} />
                  ) : it.state === "stopped" ? (
                    <Icon name="close" size={SIZES.iconXs} color={COLORS.textOnPrimary} strokeWidth={2} />
                  ) : null}
                </View>
                {!last ? <View style={[styles.tlLine, it.state === "done" && styles.tlLineDone]} /> : null}
              </View>
              <View style={[styles.tlText, !last && styles.tlTextGap]}>
                <Text style={[styles.tlTitle, it.state === "upcoming" && styles.muted]}>{it.title}</Text>
                {it.subtitle ? <Text style={styles.sub}>{it.subtitle}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.sm2 },
  flex: { flex: 1, gap: SPACING.xxs },

  actionCard: { backgroundColor: COLORS.primarySoft },
  actionTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  summaryFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  jobTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  muted: { color: COLORS.textSecondary },

  tlRow: { flexDirection: "row", gap: SPACING.sm2 },
  tlRail: { alignItems: "center", gap: SPACING.xs },
  tlDot: {
    width: SIZES.tag,
    height: SIZES.tag,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fillStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  tlDotDone: { backgroundColor: COLORS.primary },
  tlDotCurrent: { backgroundColor: COLORS.primarySoft, borderWidth: SIZES.track, borderColor: COLORS.primary },
  tlDotStopped: { backgroundColor: COLORS.errorText },
  tlLine: {
    width: SIZES.track,
    flexGrow: 1,
    minHeight: SPACING.lg,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fillStrong,
  },
  tlLineDone: { backgroundColor: COLORS.primary },
  tlText: { flex: 1, gap: SPACING.xxs },
  tlTextGap: { paddingBottom: SPACING.md },
  tlTitle: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
});
