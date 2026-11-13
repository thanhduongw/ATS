import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { useSnackbar } from "@/components/ui/snackbar";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardTitle, InfoNote, KeyValueRow } from "@/components/ui/surfaces";
import { useWorkLocationNames } from "@/features/masterdata/hooks";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { interviewStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import { useInterviewAction, useMyId, useStaffInterview, useStaffPosting } from "../hooks";
import { areaOf, EVALUABLE } from "../tasks";

const S = STRINGS.staff;
const L = S.interview;
/** Hiện ai đã nộp / chưa nộp đánh giá. */
const SHOW_EVAL = new Set(["CANDIDATE_CONFIRMED", "EVALUATION_PENDING", "COMPLETED"]);

/**
 * UR08 / UH05 · Chi tiết buổi phỏng vấn. Mỗi buổi một giờ cố định (quyết định 04/11/2026) nên không có
 * "đề xuất giờ khác" / "duyệt đổi giờ" như HTML. Đại diện phòng ban: "Xác nhận tham gia"; người phỏng vấn sau
 * buổi: "Viết đánh giá"; Chuyên viên tuyển dụng: "Huỷ buổi phỏng vấn" (đặt lịch mới làm trên máy tính).
 */
export function StaffInterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const now = useNow();
  const notify = useSnackbar();
  const iv = useStaffInterview(Number(id));
  const posting = useStaffPosting(iv.data?.jobPostingId ?? 0);
  const locations = useWorkLocationNames();
  const action = useInterviewAction();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const title = isHr ? L.titleHr : L.titleHm;
  if (iv.isPending) return (<><ScreenHeader variant="compact" back title={title} /><SkeletonList /></>);
  if (iv.isError || !iv.data) {
    return (
      <>
        <ScreenHeader variant="compact" back title={title} />
        <ErrorState message={apiErrorMessage(iv.error)} onRetry={() => void iv.refetch()} />
      </>
    );
  }

  const d = iv.data;
  const people = d.interviewers ?? [];
  const mine = people.find((p) => p.interviewerId === me);
  const start = new Date(d.scheduledAt ?? 0).getTime();
  const end = start + (d.durationMinutes ?? 60) * 60_000;
  const live = end > now && d.format === "ONLINE" && !!d.meetingLink && now > start - 15 * 60_000;
  const closed = d.status === "CANCELLED" || d.status === "COMPLETED" || d.status === "NO_SHOW";
  const canConfirm = !isHr && !!mine && d.status === "SCHEDULED" && !d.hmConfirmed;
  const canEvaluate = !!mine && !mine.evaluationSubmitted && EVALUABLE.has(d.status ?? "") && start <= now;
  const canCancel = isHr && !closed && start > now;
  const place = d.format === "ONLINE" ? S.online : (d.workLocationId != null && locations.get(d.workLocationId)) || S.onsite;
  const jobTitle = posting.data?.title ?? "";

  const run = (a: Parameters<typeof action.mutate>[0], ok: string, after?: () => void) =>
    action.mutate(a, {
      onSuccess: () => { notify(ok); after?.(); },
      onError: (e) => notify(apiErrorMessage(e)),
    });

  const bar = canConfirm || canEvaluate || canCancel || live;

  return (
    <>
      <ScreenHeader variant="compact" back title={title} subtitle={[d.candidateName, jobTitle].filter(Boolean).join(" · ")} />
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, bar && { paddingBottom: BOTTOM_BAR_SPACE }]}>
        <Card
          onPress={() => router.push({ pathname: `/${area}/applications/[id]`, params: { id: String(d.applicationId) } })}
          accessibilityLabel={`${L.profile} ${d.candidateName ?? ""}`}
        >
          <View style={styles.person}>
            <Avatar name={d.candidateName} />
            <View style={styles.flex}>
              <Text style={styles.name}>{d.candidateName}</Text>
              {jobTitle ? <Text style={styles.sub}>{jobTitle}</Text> : null}
            </View>
            <Text style={styles.link}>{L.profile}</Text>
            <Icon name="chevronRight" size={FONT_SIZE.md} color={COLORS.textSecondary} />
          </View>
        </Card>

        {d.status === "CANDIDATE_DECLINED" ? (
          <InfoNote icon="alert">{`${L.declined(d.candidateDeclineReason ?? "")} ${isHr ? L.rescheduleOnWeb : ""}`.trim()}</InfoNote>
        ) : null}

        <Card>
          <View style={styles.statusRow}>
            <StatusChip {...interviewStatus(d.status, "STAFF")} />
          </View>
          <KeyValueRow label={L.date} value={formatLongDate(d.scheduledAt)} />
          <KeyValueRow label={L.time} value={`${formatTimeRange(d.scheduledAt, d.durationMinutes)} · ${S.minutes(d.durationMinutes ?? 60)}`} />
          <KeyValueRow
            label={L.format}
            last
            value={
              d.format === "ONLINE" && d.meetingLink ? (
                <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(d.meetingLink ?? "")}>
                  <Text style={styles.linkValue}>{`${place} · ${L.openLink}`}</Text>
                </Pressable>
              ) : (
                place
              )
            }
          />
        </Card>

        <Card>
          <CardTitle>{L.interviewers}</CardTitle>
          {people.map((p) => (
            <View key={p.interviewerId} style={styles.person}>
              <Avatar name={p.fullName} size={SPACING.xl} />
              <Text style={[styles.flex, styles.body]} numberOfLines={1}>
                {p.interviewerId === me ? L.you(p.fullName ?? "") : p.fullName}
              </Text>
              {SHOW_EVAL.has(d.status ?? "") && start <= now ? (
                <StatusChip label={p.evaluationSubmitted ? L.evaluated : L.notEvaluated} tone={p.evaluationSubmitted ? "success" : "neutral"} />
              ) : null}
            </View>
          ))}
        </Card>

        {d.note ? (
          <Card>
            <CardTitle>{L.note}</CardTitle>
            <Text style={styles.body}>{d.note}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {bar ? (
        <BottomActionBar>
          {canCancel ? (
            <PillButton label={L.cancel} variant="danger" onPress={() => setConfirmCancel(true)} style={styles.flex} />
          ) : null}
          {live ? (
            <PillButton label={L.join} variant={canConfirm || canEvaluate ? "tonal" : "primary"} onPress={() => void Linking.openURL(d.meetingLink ?? "")} style={styles.flex} />
          ) : null}
          {canConfirm ? (
            <PillButton label={L.confirm} loading={action.isPending} onPress={() => run({ kind: "hmConfirm", id: d.id ?? 0 }, L.confirmed)} style={styles.flex} />
          ) : null}
          {canEvaluate ? (
            <PillButton
              label={L.write}
              onPress={() => router.push({ pathname: `/${area}/evaluations/[id]`, params: { id: String(d.id) } })}
              style={styles.flex}
            />
          ) : null}
        </BottomActionBar>
      ) : null}

      <BottomSheet
        visible={confirmCancel}
        onDismiss={() => setConfirmCancel(false)}
        title={L.cancelTitle}
        subtitle={L.cancelBody(d.candidateName ?? "")}
        footer={
          <View style={styles.sheetActions}>
            <PillButton label={L.keep} variant="tonal" onPress={() => setConfirmCancel(false)} style={styles.flex} />
            <PillButton
              label={L.cancelConfirm}
              variant="danger"
              loading={action.isPending}
              onPress={() => run({ kind: "cancel", id: d.id ?? 0 }, L.cancelled, () => setConfirmCancel(false))}
              style={styles.flex}
            />
          </View>
        }
      >
        <View />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  body: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  link: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.primaryDark },
  linkValue: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.primaryDark },
  statusRow: { flexDirection: "row" },
  sheetActions: { flexDirection: "row", gap: SPACING.sm },
});
