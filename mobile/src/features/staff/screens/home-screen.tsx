import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { apiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { IconButton, PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { SegmentedControl } from "@/components/ui/search-and-filters";
import { Card, CardTitle, IconTile } from "@/components/ui/surfaces";
import { useUnreadCount } from "@/features/notifications/hooks";
import { formatDate, formatTime } from "@/lib/format";
import { toFixedStage } from "@/lib/stages";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import type { InterviewResponse } from "@/types/api";
import {
  useMe,
  useMyId,
  useStaffApplications,
  useStaffInterviews,
  useStaffOffers,
  useStaffPostings,
  useStaffRequisitions,
} from "../hooks";
import { areaOf, managerTasks, recruiterTasks, type StaffTask } from "../tasks";

const S = STRINGS.staff;
const H = S.home;

/**
 * UR01 / UH01 · MÀN CHÍNH · Việc của tôi. Chuyên viên tuyển dụng: 3 chỉ số, việc cần làm
 * (Của tôi · Cả nhóm), lịch hôm nay. Đại diện phòng ban: việc của mình, lịch hôm nay,
 * vị trí đang tuyển của phòng (không lương).
 */
export function StaffHomeScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const now = useNow();
  const [scope, setScope] = useState<"mine" | "team">("mine");

  const profile = useMe();
  const unread = useUnreadCount();
  const apps = useStaffApplications();
  const ivs = useStaffInterviews();
  const offers = useStaffOffers({ enabled: isHr });
  const reqs = useStaffRequisitions();
  const postings = useStaffPostings();
  const queries = [apps, ivs, reqs, postings, ...(isHr ? [offers] : [])];
  const pending = queries.some((q) => q.isPending);
  const failed = queries.find((q) => q.isError);
  const refreshing = queries.some((q) => q.isRefetching);
  const refetch = () => void Promise.all(queries.map((q) => q.refetch()));

  const data = useMemo(
    () => ({
      applications: apps.data ?? [],
      interviews: ivs.data ?? [],
      offers: offers.data ?? [],
      requisitions: reqs.data ?? [],
    }),
    [apps.data, ivs.data, offers.data, reqs.data],
  );
  const tasks = useMemo(
    () => (isHr ? recruiterTasks(data, me, now) : managerTasks(data, me, now)),
    [data, isHr, me, now],
  );
  const shown = isHr && scope === "mine" ? tasks.filter((t) => t.mine) : tasks;

  const today = data.interviews
    .filter(
      (iv) =>
        iv.status !== "CANCELLED" &&
        new Date(iv.scheduledAt ?? 0).toDateString() ===
          new Date(now).toDateString(),
    )
    .filter(
      (iv) =>
        (isHr && scope === "team") ||
        (iv.interviewers ?? []).some((p) => p.interviewerId === me),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    );
  const waitingOffers = data.offers.filter(
    (o) => o.status === "APPROVED",
  ).length;
  const openPostings = (postings.data ?? []).filter((p) => p.status === "OPEN");

  const d = new Date(now);
  const firstName =
    (profile.data?.fullName ?? "").trim().split(/\s+/).pop() ?? "";
  const dateLine = H.today(
    S.weekday[d.getDay()] ?? "",
    formatDate(d.toISOString()),
  );
  // Hồ sơ người dùng không có tên phòng ban: lấy từ việc làm (Đại diện phòng ban chỉ thấy việc của phòng mình).
  const deptName = isHr
    ? ""
    : ((postings.data ?? []).find((p) => p.departmentName)?.departmentName ??
      "");

  return (
    <>
      <ScreenHeader
        title={H.hello(firstName)}
        subtitle={deptName ? `${dateLine} · ${deptName}` : dateLine}
        actions={
          <>
            <IconButton
              icon="bell"
              label={S.bell}
              badge={unread}
              onPress={() => router.push(`/${area}/notifications`)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={S.tabs.more}
              onPress={() => router.navigate(`/${area}/more`)}
            >
              <Avatar
                name={profile.data?.fullName}
                size={SPACING.xl + SPACING.sm}
              />
            </Pressable>
          </>
        }
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {pending ? (
          <SkeletonList />
        ) : failed && !apps.data ? (
          <ErrorState
            message={apiErrorMessage(failed.error)}
            onRetry={refetch}
          />
        ) : (
          <>
            {isHr ? (
              <View style={styles.metrics}>
                <Metric value={today.length} label={H.metricInterviews} />
                <Metric value={shown.length} label={H.metricTasks} />
                <Metric value={waitingOffers} label={H.metricOffers} />
              </View>
            ) : null}

            <Card>
              <CardTitle
                right={
                  isHr ? (
                    <View style={styles.segment}>
                      <SegmentedControl
                        options={[
                          { key: "mine", label: H.mine },
                          { key: "team", label: H.team },
                        ]}
                        value={scope}
                        onChange={setScope}
                      />
                    </View>
                  ) : undefined
                }
              >
                {isHr ? H.tasks : `${H.tasks} · ${shown.length}`}
              </CardTitle>
              {shown.length === 0 ? (
                <Text style={styles.muted}>{H.noTasks}</Text>
              ) : (
                shown.map((t) => <TaskRow key={t.key} task={t} />)
              )}
            </Card>

            <Card>
              <CardTitle
                right={
                  <PillButton
                    label={H.openSchedule}
                    variant="text"
                    size="sm"
                    onPress={() => router.navigate(`/${area}/interviews`)}
                  />
                }
              >
                {H.todaySchedule}
              </CardTitle>
              {today.length === 0 ? (
                <Text style={styles.muted}>{H.noInterviewsToday}</Text>
              ) : (
                today.map((iv) => (
                  <TodayRow key={iv.id} iv={iv} me={me} now={now} area={area} />
                ))
              )}
            </Card>

            {!isHr && openPostings.length > 0 ? (
              <Card>
                <CardTitle>{H.openPostings}</CardTitle>
                {openPostings.map((p) => {
                  const list = data.applications.filter(
                    (a) => a.jobPostingId === p.id,
                  );
                  const hired = list.filter(
                    (a) => toFixedStage(a.currentStageType) === "HIRED",
                  ).length;
                  return (
                    <View key={p.id} style={styles.posting}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={styles.rowSub}>
                        {H.hiredOf(hired, p.headcount ?? 0)} ·{" "}
                        {H.candidatesCount(list.length)}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TaskRow({ task }: { task: StaffTask }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(task.href)}
      style={styles.task}
    >
      <IconTile icon={task.icon} tone={task.tone} />
      <View style={styles.taskText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {task.title}
        </Text>
        {task.sub ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {task.sub}
          </Text>
        ) : null}
      </View>
      {/* Cả dòng đã bấm được — nhãn hành động chỉ là chữ, không lồng một nút trong nút. */}
      <Text style={styles.action}>{task.action}</Text>
    </Pressable>
  );
}

function TodayRow({
  iv,
  me,
  now,
  area,
}: {
  iv: InterviewResponse;
  me: number;
  now: number;
  area: string;
}) {
  const start = new Date(iv.scheduledAt ?? 0).getTime();
  const end = start + (iv.durationMinutes ?? 60) * 60_000;
  const past = end < now;
  const live =
    !past &&
    iv.format === "ONLINE" &&
    !!iv.meetingLink &&
    now > start - 15 * 60_000;
  const people = iv.interviewers ?? [];
  const mine = people.some((p) => p.interviewerId === me);
  const others = people
    .filter((p) => p.interviewerId !== me)
    .map((p) => p.fullName ?? "");
  const who = mine ? [S.you, ...others].join(", ") : others.join(", ");
  return (
    <View style={styles.today}>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: `/${area}/interviews/[id]`,
            params: { id: String(iv.id) },
          })
        }
        style={styles.todayMain}
      >
        <View style={styles.time}>
          <Text style={styles.timeText}>{formatTime(iv.scheduledAt)}</Text>
          <Text style={styles.rowSub}>
            {S.minutes(iv.durationMinutes ?? 60)}
          </Text>
        </View>
        <View style={styles.taskText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {iv.candidateName}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {iv.format === "ONLINE" ? S.online : S.onsite} · {who}
          </Text>
        </View>
      </Pressable>
      {past ? (
        <Text style={styles.past}>{H.past}</Text>
      ) : live ? (
        <PillButton
          label={H.join}
          size="sm"
          onPress={() => void Linking.openURL(iv.meetingLink ?? "")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: {
    padding: SPACING.page,
    gap: SPACING.sm2,
    paddingBottom: SPACING.xl,
  },
  metrics: { flexDirection: "row", gap: SPACING.sm },
  metric: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm2,
    gap: SPACING.xxs,
  },
  metricValue: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  segment: { width: 200 }, // một lần: bề rộng vừa 2 nhãn "Của tôi / Cả nhóm" trong tiêu đề thẻ
  muted: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  task: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  taskText: { flex: 1, gap: SPACING.xxs },
  rowTitle: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  rowSub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  today: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
    padding: SPACING.sm2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.fill,
  },
  time: { width: SPACING.xxl },
  timeText: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  todayMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
  },
  action: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryDark,
    paddingHorizontal: SPACING.sm2,
    paddingVertical: SPACING.xs + SPACING.xxs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fillStrong,
    overflow: "hidden",
  },
  past: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  posting: { gap: SPACING.xxs },
});
