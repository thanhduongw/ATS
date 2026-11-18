import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMyApplications } from "@/features/applications/hooks";
import { useMyInterviews } from "@/features/interviews/hooks";
import { awaitsReply } from "@/features/interviews/rules";
import { CandidateAppBar } from "@/components/app-bar";
import { QueryList } from "@/components/ui/query-list";
import { PageTitle } from "@/components/ui/screen-chrome";
import { FilterChips, type ChipOption } from "@/components/ui/search-and-filters";
import { Card, Divider } from "@/components/ui/surfaces";
import { StatusChip, Tag } from "@/components/ui/status-chip";
import { Icon } from "@/components/ui/icon";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { applicationPhase, stageStatus } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LETTER_SPACING, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateApplication } from "@/types/api";

const S = STRINGS.applications;
type Filter = "all" | "active" | "closed";

/**
 * Đơn của tôi — Redesign-Final `views.applications`: tiêu đề, 3 ô số (tổng · đang xử lý · đã nhận việc), chip lọc
 * Tất cả / Đang xử lý / Đã kết thúc, thẻ đơn. Thư mời và lịch phỏng vấn nằm TRONG chi tiết đơn (chốt 19/11/2026);
 * thẻ chỉ nhắc một dòng khi có lịch đang chờ ứng viên xác nhận.
 */
export default function ApplicationsScreen() {
  const query = useMyApplications();
  const interviews = useMyInterviews();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(b.appliedAt ?? 0).getTime() - new Date(a.appliedAt ?? 0).getTime()
      ),
    [query.data]
  );
  const closed = (a: CandidateApplication) => applicationPhase(a.currentStageType).ended;
  const shown = filter === "all" ? all : all.filter((a) => (filter === "closed" ? closed(a) : !closed(a)));
  const waiting = new Set(
    (interviews.data ?? []).filter((iv) => awaitsReply(iv, now)).map((iv) => iv.applicationId)
  );

  const chips: ChipOption<Filter>[] = [
    { key: "all", label: S.all },
    { key: "active", label: S.active },
    { key: "closed", label: S.closed },
  ];
  const stats = [
    { label: S.stats.total, value: all.length },
    { label: S.stats.active, value: all.filter((a) => !closed(a)).length },
    { label: S.stats.hired, value: all.filter((a) => applicationPhase(a.currentStageType).hired).length },
  ];

  // Kéo để làm mới cả lịch phỏng vấn (dòng nhắc xác nhận dựa vào nó).
  const listQuery = { ...query, refetch: () => Promise.all([query.refetch(), interviews.refetch()]) };

  return (
    <View style={styles.root}>
      <CandidateAppBar />
      <QueryList
        query={listQuery}
        data={shown}
        keyExtractor={(a, i) => String(a.id ?? i)}
        renderItem={({ item }) => <ApplicationCard app={item} waiting={item.id != null && waiting.has(item.id)} />}
        header={
          <View style={styles.header}>
            <PageTitle eyebrow={S.eyebrow} title={S.title} subtitle={S.subtitle} />
            {all.length ? (
              <>
                <View style={styles.stats}>
                  {stats.map((s) => (
                    <View key={s.label} style={styles.stat}>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel} numberOfLines={1}>
                        {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <FilterChips options={chips} value={filter} onChange={setFilter} />
              </>
            ) : null}
          </View>
        }
        empty={
          all.length
            ? { title: S.noMatchTitle, message: S.noMatchMessage }
            : {
                title: S.emptyTitle,
                message: S.emptyMessage,
                action: { label: S.browseJobs, onPress: () => router.navigate("/jobs") },
              }
        }
      />
    </View>
  );
}

function ApplicationCard({ app, waiting }: { app: CandidateApplication; waiting: boolean }) {
  const phase = applicationPhase(app.currentStageType);
  const status = phase.withdrawn
    ? stageStatus(app.currentStageType)
    : phase.ended
      ? { label: phase.hired ? S.stats.hired : S.ended, tone: phase.hired ? ("success" as const) : ("neutral" as const) }
      : stageStatus(app.currentStageType, app.currentStageName);

  return (
    <Card
      accessibilityLabel={app.jobTitle}
      onPress={() => app.id != null && router.push({ pathname: "/applications/[id]", params: { id: String(app.id) } })}
    >
      <View style={styles.row}>
        {app.id != null ? <Tag label={S.code(app.id)} /> : <View />}
        <Text style={styles.date}>{formatDate(app.appliedAt)}</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {app.jobTitle}
        </Text>
        {app.departmentName ? <Text style={styles.sub}>{app.departmentName}</Text> : null}
      </View>
      {waiting ? (
        <View style={styles.todo}>
          <Icon name="calendar" size={SIZES.iconXs + SPACING.xxs} color={COLORS.primaryDark} />
          <Text style={styles.todoText}>{S.needsReply}</Text>
        </View>
      ) : null}
      <Divider />
      <View style={styles.row}>
        <StatusChip {...status} />
        <View style={styles.link}>
          <Text style={styles.linkText}>{S.detail}</Text>
          <Icon name="arrowRight" size={SIZES.iconXs} color={COLORS.primaryDark} strokeWidth={1.8} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  header: { gap: SPACING.sm2, paddingTop: SPACING.sm2 },
  stats: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs },
  // `.stat`: ô số trắng viền mảnh.
  stat: {
    flex: 1,
    gap: SPACING.xxs,
    padding: SPACING.sm2,
    borderRadius: RADIUS.control,
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  statValue: { fontFamily: FONT.bold, fontSize: FONT_SIZE.section, letterSpacing: LETTER_SPACING.title, color: COLORS.textPrimary },
  statLabel: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm },
  date: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  titleBlock: { gap: SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  todo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm2,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.primarySoft,
  },
  todoText: { flex: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
  link: { flexDirection: "row", alignItems: "center", gap: SPACING.xxs },
  linkText: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
});
