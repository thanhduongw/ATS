import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { apiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { FilterChips } from "@/components/ui/search-and-filters";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardTitle } from "@/components/ui/surfaces";
import { formatDate } from "@/lib/format";
import { MAIN_STAGES, toFixedStage } from "@/lib/stages";
import { stageStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import type { ApplicationResponse, InterviewResponse } from "@/types/api";
import { useApplicationEvaluations, useMyId, useStaffApplications, useStaffInterviews, useStaffPostings } from "../hooks";

const L = STRINGS.staff.results;
const STAGE = STRINGS.staff.stage;
const REC = STRINGS.status.recommendation;

/**
 * UH10 · Kết quả tuyển dụng (Đại diện phòng ban, KHÔNG có lương — quyết định C7): chip theo vị trí, đã tuyển /
 * số cần, số ngày đã mở, hạn nộp, phễu 5 giai đoạn (số ứng viên đã đi tới), ứng viên đã phỏng vấn kèm tiến độ
 * đánh giá hoặc kết luận của chính mình (nhận xét người khác vẫn ẩn tới khi mình nộp).
 */
export function StaffResultsScreen() {
  const me = useMyId();
  const now = useNow();
  const postings = useStaffPostings();
  const apps = useStaffApplications();
  const ivs = useStaffInterviews();
  const [picked, setPicked] = useState<string | null>(null);

  const list = useMemo(
    () => (postings.data ?? []).filter((p) => p.status !== "DRAFT").sort((a, b) =>
      new Date(b.publishedAt ?? b.createdAt ?? 0).getTime() - new Date(a.publishedAt ?? a.createdAt ?? 0).getTime()),
    [postings.data],
  );
  const queries = [postings, apps, ivs];
  const pending = queries.some((q) => q.isPending);
  const failed = queries.find((q) => q.isError);
  const refetch = () => void Promise.all(queries.map((q) => q.refetch()));

  const header = <ScreenHeader variant="compact" back title={L.title} subtitle={list[0]?.departmentName ?? undefined} />;
  if (pending) return (<>{header}<SkeletonList /></>);
  if (failed && !postings.data) return (<>{header}<ErrorState message={apiErrorMessage(failed.error)} onRetry={refetch} /></>);
  const first = list[0];
  if (!first) return (<>{header}<EmptyState title={L.emptyTitle} message={L.emptyMessage} /></>);

  const key = picked ?? String(first.id);
  const p = list.find((x) => String(x.id) === key) ?? first;
  const pApps = (apps.data ?? []).filter((a) => a.jobPostingId === p.id);
  const idx = (a: ApplicationResponse) => MAIN_STAGES.indexOf(toFixedStage(a.currentStageType));
  const active = pApps.filter((a) => toFixedStage(a.currentStageType) !== "REJECTED");
  const reached = MAIN_STAGES.map((_, i) => active.filter((a) => idx(a) >= i).length);
  const hired = reached[MAIN_STAGES.length - 1] ?? 0;
  const openDays = p.publishedAt ? Math.max(0, Math.floor((now - new Date(p.publishedAt).getTime()) / 86_400_000)) : null;
  const max = Math.max(1, reached[0] ?? 0);

  const appIds = new Set(pApps.map((a) => a.id));
  const ivsOfApp = new Map<number, InterviewResponse[]>();
  (ivs.data ?? []).filter((iv) => appIds.has(iv.applicationId) && iv.status !== "CANCELLED").forEach((iv) => {
    ivsOfApp.set(iv.applicationId ?? 0, [...(ivsOfApp.get(iv.applicationId ?? 0) ?? []), iv]);
  });
  const interviewed = pApps.filter((a) => ivsOfApp.has(a.id ?? 0));

  return (
    <>
      {header}
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={queries.some((q) => q.isRefetching)} onRefresh={refetch} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <FilterChips options={list.map((x) => ({ key: String(x.id), label: x.title ?? "" }))} value={key} onChange={setPicked} />

        <View style={styles.metrics}>
          <Metric label={L.hired} value={`${hired}/${p.headcount ?? 0}`} />
          <Metric label={L.openFor} value={openDays != null ? L.days(openDays) : "—"} />
          <Metric label={L.deadline} value={p.applicationDeadline ? formatDate(p.applicationDeadline).slice(0, 5) : "—"} />
        </View>

        <Card>
          <CardTitle>{L.funnel}</CardTitle>
          {MAIN_STAGES.map((s, i) => (
            <View key={s} style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>{STAGE[s]}</Text>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${((reached[i] ?? 0) / max) * 100}%` }]} />
              </View>
              <Text style={styles.funnelValue}>{reached[i] ?? 0}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <CardTitle>{L.interviewed}</CardTitle>
          {interviewed.length === 0 ? (
            <Text style={styles.sub}>{L.noInterviewed}</Text>
          ) : (
            interviewed.map((a) => <InterviewedRow key={a.id} a={a} ivs={ivsOfApp.get(a.id ?? 0) ?? []} me={me} />)
          )}
        </Card>
      </ScrollView>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/** Một ứng viên đã phỏng vấn: tiến độ đánh giá, hoặc kết luận của mình nếu đã nộp. */
function InterviewedRow({ a, ivs, me }: { a: ApplicationResponse; ivs: InterviewResponse[]; me: number }) {
  const evals = useApplicationEvaluations(a.id ?? 0);
  const people = ivs.flatMap((iv) => iv.interviewers ?? []);
  const done = people.filter((x) => x.evaluationSubmitted).length;
  const waitingMe = people.some((x) => x.interviewerId === me && !x.evaluationSubmitted);
  const mine = (evals.data ?? []).find((e) => e.interviewerId === me && e.submittedAt);
  const note = mine?.overallRecommendation ? L.yours(REC[mine.overallRecommendation]) : L.evalProgress(done, people.length, waitingMe);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/hm/applications/[id]", params: { id: String(a.id) } })}
      style={styles.person}
    >
      <Avatar name={a.candidateName} size={SPACING.xl} />
      <View style={styles.flex}>
        <Text style={styles.name} numberOfLines={1}>{a.candidateName}</Text>
        <Text style={styles.sub} numberOfLines={1}>{note}</Text>
      </View>
      <StatusChip {...stageStatus(a.currentStageType, a.currentStageName)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  metrics: { flexDirection: "row", gap: SPACING.sm },
  metric: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.sm2, gap: SPACING.xxs },
  metricValue: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  funnelRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  funnelLabel: { width: SPACING.xxl + SPACING.lg, fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  track: { flex: 1, height: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.fill, overflow: "hidden" },
  bar: { height: "100%", borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  funnelValue: { width: SPACING.lg, textAlign: "right", fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.xs },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
});
