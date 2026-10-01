import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMyApplications } from "@/features/applications/hooks";
import { useMyInterviews, useMyPendingSlots } from "@/features/interviews/hooks";
import { InterviewAction } from "@/features/interviews/interview-actions";
import { useMyOffers } from "@/features/offers/hooks";
import { QueryList } from "@/components/ui/query-list";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { Card } from "@/components/ui/surfaces";
import { StatusChip } from "@/components/ui/status-chip";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { STRINGS } from "@/lib/strings";
import { applicationPhase, stageStatus } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";
import type { CandidateApplication, CandidateInterview } from "@/types/api";

const S = STRINGS.applications;

/** Việc ứng viên cần làm ngay với một đơn — quyết định dòng hành động cuối thẻ. */
type Todo = { kind: "slot" } | { kind: "confirm"; interview: CandidateInterview } | null;

/** Hồ sơ ứng tuyển (B3) — giao diện canvas Mobile v2 N29. */
export default function ApplicationsScreen() {
  const query = useMyApplications();
  const interviews = useMyInterviews();
  const slots = useMyPendingSlots();
  const offers = useMyOffers();

  const list = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => new Date(b.appliedAt ?? 0).getTime() - new Date(a.appliedAt ?? 0).getTime()
      ),
    [query.data]
  );

  const todoFor = (appId?: number): Todo => {
    if (appId == null) return null;
    if ((slots.data ?? []).some((s) => s.applicationId === appId)) return { kind: "slot" };
    const iv = (interviews.data ?? []).find((i) => i.applicationId === appId && i.status === "HM_CONFIRMED");
    return iv ? { kind: "confirm", interview: iv } : null;
  };
  const declinedOffer = (appId?: number) =>
    (offers.data ?? []).some((o) => o.applicationId === appId && o.status === "DECLINED");

  // Kéo để làm mới mọi thứ thẻ đang dựa vào, không chỉ danh sách đơn.
  const listQuery = {
    ...query,
    refetch: () => Promise.all([query.refetch(), interviews.refetch(), slots.refetch(), offers.refetch()]),
  };

  return (
    <>
      <ScreenHeader title={S.title} />
      <QueryList
        query={listQuery}
        data={list}
        keyExtractor={(a, i) => String(a.id ?? i)}
        renderItem={({ item }) => (
          <ApplicationCard app={item} todo={todoFor(item.id)} declined={declinedOffer(item.id)} />
        )}
        empty={{
          title: S.emptyTitle,
          message: S.emptyMessage,
          action: { label: S.browseJobs, onPress: () => router.navigate("/jobs") },
        }}
      />
    </>
  );
}

function ApplicationCard({ app, todo, declined }: { app: CandidateApplication; todo: Todo; declined: boolean }) {
  const phase = applicationPhase(app.currentStageType);
  const status =
    todo?.kind === "slot"
      ? { label: S.needSlot, tone: "warning" as const }
      : phase.ended
        ? { label: S.ended, tone: phase.hired ? ("success" as const) : ("neutral" as const) }
        : stageStatus(app.currentStageType, app.currentStageName);

  const note = phase.rejected
    ? declined
      ? S.offerDeclined
      : app.rejectionReasonName
        ? S.note.rejectedReason(app.rejectionReasonName)
        : S.note.rejected
    : phase.hired
      ? S.note.hired
      : ([S.note.received, S.note.screening, S.note.interview, S.note.offer][phase.step] ?? S.note.screening);

  const open = () =>
    app.id != null && router.push({ pathname: "/applications/[id]", params: { id: String(app.id) } });

  return (
    <Card onPress={open} accessibilityLabel={app.jobTitle}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>
            {app.jobTitle}
          </Text>
          <Text style={styles.sub}>{S.meta(app.departmentName ?? "", formatDate(app.appliedAt).slice(0, 5))}</Text>
        </View>
        <StatusChip {...status} />
      </View>

      <PhaseStepper step={phase.step} done={phase.ended} stopped={phase.rejected} />

      {todo ? (
        <View style={styles.todo}>
          <Text style={styles.todoText}>{todo.kind === "slot" ? S.inviteInterview : S.confirmInterview}</Text>
          {todo.kind === "slot" ? (
            <PillButton
              label={S.pickTime}
              size="sm"
              onPress={() =>
                router.push({ pathname: "/interviews/schedule", params: { applicationId: String(app.id) } })
              }
            />
          ) : (
            <InterviewAction interview={todo.interview} />
          )}
        </View>
      ) : (
        <Text style={styles.note}>{note}</Text>
      )}
    </Card>
  );
}

/**
 * Thanh 4 chặng ngang (canvas N29: Nộp · Sàng lọc · PV · Kết quả): đã qua = dấu tích, đang ở =
 * số có viền sáng, chưa đến = xám. Đơn bị loại: chặng cuối hiện dấu ✕.
 */
function PhaseStepper({ step, done, stopped }: { step: number; done: boolean; stopped: boolean }) {
  const last = S.phases.length - 1;
  // Đơn đã kết thúc (trúng tuyển hoặc bị loại) → coi như tới chặng "Kết quả".
  const current = done ? last : step;
  return (
    <View style={styles.stepper} accessibilityLabel={S.phases[current]}>
      {S.phases.map((label, i) => {
        const passed = i < current || (done && i === last && !stopped);
        const here = i === current && !done;
        const cross = stopped && i === last;
        return (
          <View key={label} style={styles.stepCol}>
            <View style={styles.stepTrack}>
              {/* lineHidden đứng SAU lineOn để thắng: đầu và cuối thanh không có đoạn nối. */}
              <View style={[styles.line, i <= current && styles.lineOn, i === 0 && styles.lineHidden]} />
              <View style={[styles.ring, here && styles.ringOn]}>
                <View style={[styles.dot, (passed || here) && styles.dotOn, cross && styles.dotStop]}>
                  {passed ? (
                    <Icon name="check" size={SIZES.iconXs} color={COLORS.textOnPrimary} strokeWidth={2} />
                  ) : cross ? (
                    <Icon name="close" size={SIZES.iconXs} color={COLORS.textOnPrimary} strokeWidth={2} />
                  ) : (
                    <Text style={[styles.dotText, here && styles.dotTextOn]}>{i + 1}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.line, i < current && styles.lineOn, i === last && styles.lineHidden]} />
            </View>
            <Text
              style={[styles.stepLabel, here && styles.stepLabelOn, !passed && !here && !cross && styles.stepLabelOff]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = SIZES.tag;
const RING = DOT + SPACING.sm;

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  headText: { flex: 1, gap: SPACING.xxs },
  title: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  note: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  todo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm2,
    paddingRight: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
  },
  todoText: { flex: 1, fontFamily: FONT.medium, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary },

  stepper: { flexDirection: "row" },
  stepCol: { flex: 1, alignItems: "center", gap: SPACING.xs },
  stepTrack: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  line: { flex: 1, height: SIZES.track, borderRadius: RADIUS.full, backgroundColor: COLORS.fillStrong },
  lineOn: { backgroundColor: COLORS.primary },
  lineHidden: { backgroundColor: "transparent" },
  ring: { width: RING, height: RING, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center" },
  ringOn: { backgroundColor: COLORS.primarySoft },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fillStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { backgroundColor: COLORS.primary },
  dotStop: { backgroundColor: COLORS.textMuted },
  dotText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  dotTextOn: { fontFamily: FONT.bold, color: COLORS.textOnPrimary },
  stepLabel: { fontFamily: FONT.medium, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, textAlign: "center" },
  stepLabelOn: { color: COLORS.primaryDark },
  stepLabelOff: { color: COLORS.textSecondary },
});
