import { useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import {
  BOTTOM_BAR_SPACE,
  BottomActionBar,
  ScreenHeader,
} from "@/components/ui/screen-chrome";
import { FilterChips } from "@/components/ui/search-and-filters";
import { AiScoreBadge, StatusChip } from "@/components/ui/status-chip";
import { Card, CardTitle, InfoNote } from "@/components/ui/surfaces";
import {
  formatDate,
  formatMoney,
  formatSalary,
  formatTime,
} from "@/lib/format";
import { fixedStageView, toFixedStage } from "@/lib/stages";
import {
  interviewStatus,
  offerStatus,
  recommendationStatus,
} from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/store/authStore";
import {
  COLORS,
  FONT,
  FONT_SIZE,
  LINE_HEIGHT,
  RADIUS,
  SIZES,
  SPACING,
} from "@/theme";
import type { EvaluationResponse, InterviewResponse } from "@/types/api";
import {
  useAiScore,
  useApplicationEvaluations,
  useApplicationHistory,
  useMyId,
  useStaffApplication,
  useStaffInterviews,
  useStaffOffers,
} from "../hooks";
import { MoveStageSheet, nextStageOf, RejectSheet } from "../stage-sheets";
import { areaOf, needsMyEvaluation, when } from "../tasks";

const S = STRINGS.staff;
const P = S.profile;
type Tab = "ai" | "evaluations" | "interviews" | "offers" | "activity";

/**
 * UR03 / UR04 · Hồ sơ ứng viên (Chuyên viên tuyển dụng) và UH03 (Đại diện phòng ban — đánh giá của
 * người khác ẩn tới khi mình nộp; backend trả `contentVisible = false`). Thanh dưới:
 * HR "Từ chối / Chuyển giai đoạn" (UR05, UR06); người phỏng vấn chưa nộp "Viết đánh giá".
 */
export function StaffApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appId = Number(id);
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const area = areaOf(role);
  const me = useMyId();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("ai");
  const [sheet, setSheet] = useState<"move" | "reject" | null>(null);

  const app = useStaffApplication(appId);
  const ivs = useStaffInterviews();
  const evals = useApplicationEvaluations(appId);
  const offers = useStaffOffers({ enabled: isHr });
  const refetch = () =>
    void Promise.all([
      app.refetch(),
      ivs.refetch(),
      evals.refetch(),
      offers.refetch(),
    ]);

  if (app.isPending)
    return (
      <>
        <ScreenHeader title="" variant="compact" back />
        <SkeletonList />
      </>
    );
  if (app.isError || !app.data) {
    return (
      <>
        <ScreenHeader title="" variant="compact" back />
        <ErrorState message={apiErrorMessage(app.error)} onRetry={refetch} />
      </>
    );
  }
  const a = app.data;
  const stage = toFixedStage(a.currentStageType);
  const ended = stage === "HIRED" || stage === "REJECTED";
  const interviews = (ivs.data ?? [])
    .filter((iv) => iv.applicationId === appId && iv.status !== "CANCELLED")
    .sort(
      (x, y) =>
        new Date(y.scheduledAt ?? 0).getTime() -
        new Date(x.scheduledAt ?? 0).getTime(),
    );
  const myPending = interviews.find((iv) => needsMyEvaluation(iv, me, now));
  const latest = interviews[0];
  const pendingNames = (latest?.interviewers ?? [])
    .filter((p) => !p.evaluationSubmitted)
    .map((p) => p.fullName ?? "");
  const myOffers = (offers.data ?? []).filter((o) => o.applicationId === appId);
  const submitted = (evals.data ?? []).filter((e) => e.submittedAt);
  const totalInterviewers = new Set(
    interviews.flatMap((iv) =>
      (iv.interviewers ?? []).map((p) => p.interviewerId),
    ),
  ).size;
  const next = nextStageOf(a);

  const tabs = [
    { key: "ai" as const, label: P.tabs.ai },
    {
      key: "evaluations" as const,
      label: totalInterviewers
        ? P.evaluationsCount(submitted.length, totalInterviewers)
        : P.tabs.evaluations,
    },
    { key: "interviews" as const, label: P.tabs.interviews },
    ...(isHr ? [{ key: "offers" as const, label: P.tabs.offers }] : []),
    { key: "activity" as const, label: P.tabs.activity },
  ];
  const showBar = (isHr && !ended) || !!myPending;

  return (
    <>
      <ScreenHeader title={a.candidateName ?? ""} variant="compact" back />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          showBar && {
            paddingBottom: BOTTOM_BAR_SPACE + insets.bottom + SPACING.md,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={app.isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Card>
          <View style={styles.headRow}>
            <Avatar name={a.candidateName} />
            <View style={styles.flex}>
              <Text style={styles.name}>{a.candidateName}</Text>
              <Text style={styles.sub}>{a.jobTitle}</Text>
            </View>
            {a.aiScore != null ? (
              <AiScoreBadge score={Math.round(a.aiScore)} />
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <StatusChip {...fixedStageView(a.currentStageType)} />
            <Text style={styles.sub}>{P.applied(formatDate(a.appliedAt))}</Text>
          </View>
          {a.resumeUrl ? (
            <PillButton
              label={P.cv}
              icon="file"
              variant="tonal"
              size="sm"
              onPress={() => void Linking.openURL(a.resumeUrl ?? "")}
            />
          ) : null}
        </Card>

        <FilterChips options={tabs} value={tab} onChange={setTab} />

        {tab === "ai" ? <AiTab applicationId={appId} /> : null}
        {tab === "evaluations" ? (
          <EvaluationsTab
            interviews={interviews}
            evaluations={evals.data ?? []}
            me={me}
            showSalary={isHr}
          />
        ) : null}
        {tab === "interviews" ? (
          interviews.length === 0 ? (
            <InfoNote>{P.interviewsNone}</InfoNote>
          ) : (
            interviews.map((iv) => (
              <Card
                key={iv.id}
                onPress={() =>
                  router.push({
                    pathname: `/${area}/interviews/[id]`,
                    params: { id: String(iv.id) },
                  })
                }
              >
                <View style={styles.headRow}>
                  <Text style={[styles.rowTitle, styles.flex]}>
                    {when(iv.scheduledAt)}
                  </Text>
                  <StatusChip {...interviewStatus(iv.status, "STAFF")} />
                </View>
                <Text style={styles.sub}>
                  {iv.format === "ONLINE" ? S.online : S.onsite} ·{" "}
                  {(iv.interviewers ?? []).map((p) => p.fullName).join(", ")}
                </Text>
              </Card>
            ))
          )
        ) : null}
        {tab === "offers" ? (
          <>
            <InfoNote>{P.offersDesktop}</InfoNote>
            {myOffers.length === 0 ? (
              <InfoNote>{P.offersNone}</InfoNote>
            ) : (
              myOffers.map((o) => (
                <Card
                  key={o.id}
                  onPress={() =>
                    router.push({
                      pathname: "/hr/offers",
                      params: { id: String(o.id) },
                    })
                  }
                >
                  <View style={styles.headRow}>
                    <Text style={[styles.rowTitle, styles.flex]}>
                      {formatMoney(o.salaryOffered)}
                    </Text>
                    <StatusChip {...offerStatus(o.status, "STAFF")} />
                  </View>
                  <Text style={styles.sub}>{formatDate(o.startDate)}</Text>
                </Card>
              ))
            )}
          </>
        ) : null}
        {tab === "activity" ? <ActivityTab applicationId={appId} /> : null}
      </ScrollView>

      {showBar ? (
        <BottomActionBar>
          {isHr && !ended ? (
            <>
              <PillButton
                label={P.reject}
                variant="danger"
                // Co theo chữ để nút chính "Chuyển sang …" đủ chỗ trên máy hẹp.
                onPress={() => setSheet("reject")}
              />
              <PillButton
                label={next ? P.moveTo(S.stage[next]) : P.move}
                style={styles.flex}
                fullWidth
                onPress={() => setSheet("move")}
              />
            </>
          ) : myPending ? (
            <PillButton
              label={P.evals.write}
              fullWidth
              style={styles.flex}
              onPress={() =>
                router.push({
                  pathname: `/${area}/evaluations/[id]`,
                  params: { id: String(myPending.id) },
                })
              }
            />
          ) : null}
        </BottomActionBar>
      ) : null}

      {isHr ? (
        <>
          <MoveStageSheet
            app={a}
            visible={sheet === "move"}
            onDismiss={() => setSheet(null)}
            pendingNames={stage === "INTERVIEW" ? pendingNames : []}
            offerAccepted={myOffers.some((o) => o.status === "ACCEPTED")}
          />
          <RejectSheet
            app={a}
            visible={sheet === "reject"}
            onDismiss={() => setSheet(null)}
          />
        </>
      ) : null}
    </>
  );
}

/** UR03 theo B6: xếp loại, "Đáp ứng x/y yêu cầu bắt buộc", tiêu chí mức x/4 — không dùng mẫu 0–100 và mục lương. */
function AiTab({ applicationId }: { applicationId: number }) {
  const q = useAiScore(applicationId);
  const A = P.ai;
  if (q.isPending) return <SkeletonList count={1} />;
  if (q.isError)
    return (
      <ErrorState
        message={apiErrorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  const d = q.data;
  if (!d || !d.result) {
    const msg = !d ? A.notScored : d.status === "FAILED" ? A.failed : A.scoring;
    return <InfoNote>{msg}</InfoNote>;
  }
  const reqs = d.result.requirements ?? [];
  const met = reqs.filter((r) => r.status === "MET").length;
  return (
    <Card>
      <View style={styles.headRow}>
        {d.totalScore != null ? (
          <AiScoreBadge score={Math.round(d.totalScore)} />
        ) : null}
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{d.result.tier_label}</Text>
          <Text style={styles.sub}>{A.scoredAt(formatDate(d.scoredAt))}</Text>
        </View>
      </View>
      {reqs.length ? (
        <Text style={styles.rowTitle}>{A.requirements(met, reqs.length)}</Text>
      ) : null}
      {d.result.dimensions.map((dim) => (
        <View key={dim.dimension} style={styles.dim}>
          <View style={styles.headRow}>
            <Text style={[styles.dimLabel, styles.flex]}>{dim.label}</Text>
            <Text style={styles.dimLevel}>
              {dim.applicable && dim.level != null
                ? A.level(dim.level)
                : A.notApplicable}
            </Text>
          </View>
          {dim.reason ? <Text style={styles.body}>{dim.reason}</Text> : null}
        </View>
      ))}
      {d.result.summary ? (
        <Text style={styles.body}>{d.result.summary}</Text>
      ) : null}
      <InfoNote>{A.disclaimer}</InfoNote>
    </Card>
  );
}

/** UR04 (đủ nội dung) / UH03 (phiếu của người khác ẩn tới khi mình nộp). */
function EvaluationsTab({
  interviews,
  evaluations,
  me,
  showSalary,
}: {
  interviews: InterviewResponse[];
  evaluations: EvaluationResponse[];
  me: number;
  /** Đề xuất lương chỉ Chuyên viên tuyển dụng thấy (C7); người phỏng vấn chỉ thấy phiếu của mình. */
  showSalary: boolean;
}) {
  const E = P.evals;
  if (interviews.length === 0 && evaluations.length === 0)
    return <InfoNote>{E.none}</InfoNote>;
  return (
    <>
      {interviews.map((iv) => {
        const people = iv.interviewers ?? [];
        const list = evaluations.filter((e) => e.interviewId === iv.id);
        const done = people.filter((p) => p.evaluationSubmitted).length;
        const hidden = list.filter(
          (e) => e.submittedAt && e.contentVisible === false,
        );
        const visible = list.filter(
          (e) => e.submittedAt && e.contentVisible !== false,
        );
        const scores = visible
          .flatMap((e) => (e.scores ?? []).map((s) => s.score ?? 0))
          .filter((n) => n > 0);
        const avg = scores.length
          ? (scores.reduce((x, y) => x + y, 0) / scores.length)
              .toFixed(1)
              .replace(".", ",")
          : null;
        const salaries = visible
          .filter((e) => showSalary || e.interviewerId === me)
          .map((e) => e.salaryProposed)
          .filter((v): v is number => v != null);
        return (
          <Card key={iv.id}>
            <CardTitle
              right={
                <Text style={styles.sub}>
                  {E.submittedCount(done, people.length)}
                </Text>
              }
            >
              {E.session(when(iv.scheduledAt))}
            </CardTitle>
            {avg || salaries.length ? (
              <View style={styles.summary}>
                {avg ? (
                  <Text style={styles.sub}>
                    {E.avg} <Text style={styles.rowTitle}>{avg}</Text>
                  </Text>
                ) : null}
                {salaries.length ? (
                  <Text style={styles.sub}>
                    {E.salary}{" "}
                    <Text style={styles.rowTitle}>
                      {formatSalary(
                        Math.min(...salaries),
                        Math.max(...salaries),
                      )}
                    </Text>
                  </Text>
                ) : null}
              </View>
            ) : null}
            {hidden.length ? (
              <View style={styles.hidden}>
                <Text style={styles.rowTitle}>{E.hiddenTitle}</Text>
                <Text style={styles.body}>{E.hidden(hidden.length)}</Text>
              </View>
            ) : null}
            {people.map((p) => {
              const ev = visible.find(
                (e) => e.interviewerId === p.interviewerId,
              );
              if (!ev && p.evaluationSubmitted && p.interviewerId !== me)
                return null; // đang ẩn — đã gộp ở trên
              return (
                <View key={p.interviewerId} style={styles.evaluation}>
                  <View style={styles.headRow}>
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle}>{p.fullName}</Text>
                      <Text style={styles.sub}>
                        {ev?.submittedAt
                          ? E.submittedAt(
                              `${formatDate(ev.submittedAt).slice(0, 5)} ${formatTime(ev.submittedAt)}`,
                            )
                          : E.notSubmitted}
                      </Text>
                    </View>
                    {ev ? (
                      <StatusChip
                        {...recommendationStatus(ev.overallRecommendation)}
                      />
                    ) : null}
                  </View>
                  {ev?.scores?.length ? (
                    <Text style={styles.sub}>
                      {ev.scores
                        .map((s) => `${s.criteriaName} ${s.score}/5`)
                        .join(" · ")}
                    </Text>
                  ) : null}
                  {ev?.generalComment ? (
                    <Text style={styles.body}>{ev.generalComment}</Text>
                  ) : null}
                  {ev?.salaryProposed != null && (showSalary || ev.interviewerId === me) ? (
                    <Text style={styles.salary}>
                      {E.salaryProposed(formatMoney(ev.salaryProposed))}
                      {ev.salaryNote ? ` · ${ev.salaryNote}` : ""}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}

function ActivityTab({ applicationId }: { applicationId: number }) {
  const q = useApplicationHistory(applicationId);
  if (q.isPending) return <SkeletonList count={2} />;
  if (q.isError)
    return (
      <ErrorState
        message={apiErrorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  const list = [...(q.data ?? [])].sort(
    (x, y) =>
      new Date(y.changedAt ?? 0).getTime() -
      new Date(x.changedAt ?? 0).getTime(),
  );
  if (!list.length) return <InfoNote>{P.activityNone}</InfoNote>;
  return (
    <Card>
      {list.map((h, i) => (
        <View key={h.id ?? i} style={styles.activity}>
          <Text style={styles.rowTitle}>{h.toStageName}</Text>
          <Text style={styles.sub}>
            {formatDate(h.changedAt)} {formatTime(h.changedAt)}
            {P.activityBy(h.changedByUserName ?? "")}
          </Text>
          {h.note ? <Text style={styles.body}>{h.note}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2 },
  flex: { flex: 1 },
  headRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  name: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.h3,
    color: COLORS.textPrimary,
  },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
  },
  rowTitle: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.body,
    color: COLORS.textPrimary,
  },
  dim: {
    gap: SPACING.xxs,
    paddingTop: SPACING.sm,
    borderTopWidth: SIZES.hairline,
    borderTopColor: COLORS.divider,
  },
  dimLabel: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  dimLevel: {
    fontFamily: FONT.bold,
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryDark,
  },
  summary: { flexDirection: "row", gap: SPACING.md },
  hidden: {
    padding: SPACING.sm2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.fill,
    gap: SPACING.xs,
  },
  evaluation: {
    gap: SPACING.xs,
    paddingTop: SPACING.sm2,
    borderTopWidth: SIZES.hairline,
    borderTopColor: COLORS.divider,
  },
  salary: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.caption,
    color: COLORS.primaryDark,
  },
  activity: { gap: SPACING.xxs },
});
