import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMyInterviews, useMyPendingSlots } from "@/features/interviews/hooks";
import { InterviewAction, interviewPlace } from "@/features/interviews/interview-actions";
import { useApplicationsById } from "@/features/applications/hooks";
import { useWorkLocationNames } from "@/features/masterdata/hooks";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { SegmentedControl, type ChipOption } from "@/components/ui/search-and-filters";
import { Card, CardTitle } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { interviewStatus } from "@/lib/status";
import { dateTile, formatLongDate, formatTimeRange } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateInterview } from "@/types/api";

const S = STRINGS.interviews;
type Tab = "upcoming" | "past";
const TABS: ChipOption<Tab>[] = [
  { key: "upcoming", label: S.upcoming },
  { key: "past", label: S.past },
];

/** Buổi đã kết thúc theo trạng thái, dù giờ hẹn còn ở tương lai. */
const FINISHED = new Set(["EVALUATION_PENDING", "COMPLETED", "NO_SHOW", "CANCELLED"]);

/** M10 — Lịch phỏng vấn (B5): xác nhận buổi đã hẹn, báo giờ rảnh cho khung giờ HR đề xuất. */
export default function InterviewsScreen() {
  const now = useNow();
  const query = useMyInterviews();
  const slots = useMyPendingSlots();
  const apps = useApplicationsById();
  const locations = useWorkLocationNames();
  const [tab, setTab] = useState<Tab>("upcoming");

  const { upcoming, past } = useMemo(() => {
    const up: CandidateInterview[] = [];
    const done: CandidateInterview[] = [];
    for (const iv of query.data ?? []) {
      const start = iv.scheduledAt ? new Date(iv.scheduledAt).getTime() : 0;
      const end = start + (iv.durationMinutes ?? 0) * 60_000;
      (end >= now && !FINISHED.has(iv.status ?? "") ? up : done).push(iv);
    }
    const t = (iv: CandidateInterview) => new Date(iv.scheduledAt ?? 0).getTime();
    up.sort((a, b) => t(a) - t(b));
    done.sort((a, b) => t(b) - t(a));
    return { upcoming: up, past: done };
  }, [query.data, now]);

  const pendingSlots = slots.data ?? [];
  const jobTitle = (iv: { applicationId?: number }) =>
    (iv.applicationId != null && apps.get(iv.applicationId)?.jobTitle) || S.jobFallback;

  // Kéo để làm mới cả buổi PV lẫn khung giờ chờ báo rảnh.
  const listQuery = {
    ...query,
    refetch: () => Promise.all([query.refetch(), slots.refetch()]),
    isRefetching: query.isRefetching || slots.isRefetching,
  };

  return (
    <>
      <ScreenHeader title={S.title} />
      <QueryList
        query={listQuery}
        data={tab === "upcoming" ? upcoming : past}
        keyExtractor={(iv, i) => String(iv.id ?? i)}
        renderItem={({ item }) => (
          <InterviewCard
            interview={item}
            title={jobTitle(item)}
            place={interviewPlace(item, locations)}
            onPress={() =>
              item.applicationId != null &&
              router.push({ pathname: "/applications/[id]", params: { id: String(item.applicationId) } })
            }
          />
        )}
        header={
          <>
            <SegmentedControl options={TABS} value={tab} onChange={setTab} />
            {tab === "upcoming" && pendingSlots.length ? (
              <PendingSlotsCard count={pendingSlots.length} />
            ) : null}
          </>
        }
        empty={
          tab === "upcoming"
            ? { title: S.emptyUpcomingTitle, message: S.emptyUpcomingMessage }
            : { title: S.emptyPastTitle, message: S.emptyPastMessage }
        }
        // Chưa có buổi chính thức nhưng đang có khung giờ chờ báo rảnh → thẻ khung giờ đã đủ dẫn việc.
        hideEmpty={tab === "upcoming" && pendingSlots.length > 0}
      />
    </>
  );
}

function InterviewCard({
  interview,
  title,
  place,
  onPress,
}: {
  interview: CandidateInterview;
  title: string;
  place: string;
  onPress: () => void;
}) {
  const tile = dateTile(interview.scheduledAt);
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${formatLongDate(interview.scheduledAt)}`}>
      <View style={styles.row}>
        <View style={styles.dateTile}>
          <Text style={styles.dateMonth}>{tile.month}</Text>
          <Text style={styles.dateDay}>{tile.day}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.sub}>{formatTimeRange(interview.scheduledAt, interview.durationMinutes)}</Text>
          <Text style={styles.sub}>{place}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <StatusChip {...interviewStatus(interview.status, "CANDIDATE")} />
        <InterviewAction interview={interview} />
      </View>
    </Card>
  );
}

/** Thẻ nhắc khung giờ chờ báo rảnh (canvas N32) — bấm để sang màn Chọn giờ (N31). */
function PendingSlotsCard({ count }: { count: number }) {
  return (
    <Card style={styles.pending}>
      <CardTitle>{S.pendingTitle(count)}</CardTitle>
      <Text style={styles.hint}>{S.pendingHint}</Text>
      <PillButton
        label={STRINGS.applications.pickTime}
        icon="calendar"
        fullWidth
        onPress={() => router.push("/interviews/schedule")}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  dateTile: {
    width: SIZES.otpHeight,
    height: SIZES.otpHeight + SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonth: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.primaryDark },
  dateDay: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h2,
    lineHeight: FONT_SIZE.h2 * LINE_HEIGHT.title,
    color: COLORS.primaryDark,
  },
  info: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  hint: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  pending: { backgroundColor: COLORS.primarySoft },
});
