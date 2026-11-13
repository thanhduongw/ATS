import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { useSnackbar } from "@/components/ui/snackbar";
import { Card, CardTitle, InfoNote, KeyValueRow } from "@/components/ui/surfaces";
import { formatMoney, formatSalary, formatTime, formatTimeRange, formatDate } from "@/lib/format";
import { STRINGS } from "@/lib/strings";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { EvaluationDraftRequest } from "@/types/api";
import {
  useCriteria,
  useInterviewEvaluations,
  useMyId,
  useSaveEvaluationDraft,
  useStaffInterview,
  useStaffPosting,
  useSubmitEvaluation,
} from "../hooks";
import { areaOf, EVALUABLE } from "../tasks";

const S = STRINGS.staff;
const L = S.evaluation;
const REC = STRINGS.status.recommendation;
const RECS = ["STRONG_YES", "YES", "NO", "STRONG_NO"] as const;
type Rec = (typeof RECS)[number];

/** Cùng ràng buộc với web (`evaluationSubmitSchema`): kết luận, nhận xét chung, ít nhất 1 tiêu chí. */
const schema = z.object({
  scores: z.record(z.string(), z.number().min(0).max(5)),
  comments: z.record(z.string(), z.string().max(1000)),
  recommendation: z.enum(RECS).nullable(),
  generalComment: z.string().max(3000),
  salary: z.string().max(15),
  salaryNote: z.string().max(500),
});
type Values = z.infer<typeof schema>;

const digits = (s: string) => s.replace(/\D/g, "");
const toNumber = (s: string) => (digits(s) ? Number(digits(s)) : undefined);
const one = (n: number) => n.toFixed(1).replace(".", ",");
/** "34000000" → "34.000.000" (ô lương UR09; `digits()` bỏ dấu chấm trước khi gửi). */
const grouped = (s: string) => digits(s).replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function toBody(v: Values): EvaluationDraftRequest {
  return {
    overallRecommendation: v.recommendation ?? undefined,
    generalComment: v.generalComment.trim() || undefined,
    salaryProposed: toNumber(v.salary),
    salaryNote: v.salaryNote.trim() || undefined,
    scores: Object.entries(v.scores)
      .filter(([, s]) => s > 0)
      .map(([id, score]) => ({ criteriaId: Number(id), score, comment: v.comments[id]?.trim() || undefined })),
  };
}

/**
 * UR09 / UH07 · Viết đánh giá phỏng vấn (route nhận id BUỔI phỏng vấn) · UH08 xác nhận nộp.
 * Tự lưu nháp 1,5 giây sau lần sửa cuối (PUT …/evaluations/me). Đánh giá của người khác chỉ hiện sau khi nộp.
 */
export function StaffEvaluationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const interviewId = Number(id);
  const area = areaOf(useAuthStore((s) => s.user?.role));
  const me = useMyId();
  const notify = useSnackbar();
  const iv = useStaffInterview(interviewId);
  const evals = useInterviewEvaluations(interviewId);
  const criteria = useCriteria();
  const posting = useStaffPosting(iv.data?.jobPostingId ?? 0);
  const save = useSaveEvaluationDraft(interviewId);
  const submit = useSubmitEvaluation(interviewId);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [salaryNoteOpen, setSalaryNoteOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const loaded = useRef(false);

  const mine = (evals.data ?? []).find((e) => e.interviewerId === me);
  const list = (criteria.data ?? []).filter((c) => c.active !== false);

  const { control, setValue, getValues, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { scores: {}, comments: {}, recommendation: null, generalComment: "", salary: "", salaryNote: "" },
  });
  const values = useWatch({ control }) as Values;

  // Nạp bản nháp đã lưu (một lần).
  useEffect(() => {
    if (loaded.current || !evals.isSuccess) return;
    loaded.current = true;
    if (!mine) return;
    const scores: Record<string, number> = {};
    const comments: Record<string, string> = {};
    (mine.scores ?? []).forEach((s) => {
      const k = String(s.criteriaId);
      scores[k] = s.score ?? 0;
      if (s.comment) comments[k] = s.comment;
    });
    reset({
      scores, comments,
      recommendation: (mine.overallRecommendation as Rec | undefined) ?? null,
      generalComment: mine.generalComment ?? "",
      salary: mine.salaryProposed != null ? grouped(String(Math.round(mine.salaryProposed))) : "",
      salaryNote: mine.salaryNote ?? "",
    });
  }, [evals.isSuccess, mine, reset]);

  // Tự lưu nháp khi người dùng sửa (bỏ qua lần nạp đầu).
  const dirtyKey = JSON.stringify(values);
  const lastSaved = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded.current || mine?.submittedAt) return;
    if (lastSaved.current === null) { lastSaved.current = dirtyKey; return; }
    if (lastSaved.current === dirtyKey) return;
    const t = setTimeout(() => {
      lastSaved.current = dirtyKey;
      save.mutate(toBody(getValues()), {
        onSuccess: () => setSavedAt(formatTime(new Date().toISOString())),
        onError: (e) => notify(apiErrorMessage(e)),
      });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyKey]);

  // Ngăn nghìn ngay khi gõ (ô chỉ nhận số).
  useEffect(() => {
    const v = values.salary ?? "";
    if (grouped(v) !== v) setValue("salary", grouped(v));
  }, [values.salary, setValue]);

  const scored = Object.values(values.scores ?? {}).filter((s) => s > 0);
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
  const others = useMemo(
    () => (iv.data?.interviewers ?? []).filter((p) => p.interviewerId !== me).map((p) => p.fullName ?? ""),
    [iv.data?.interviewers, me],
  );

  if (iv.isPending || evals.isPending || criteria.isPending) {
    return (<><ScreenHeader variant="compact" back title={L.title} /><SkeletonList /></>);
  }
  const failed = [iv, evals, criteria].find((q) => q.isError);
  if (failed || !iv.data) {
    return (
      <>
        <ScreenHeader variant="compact" back title={L.title} />
        <ErrorState message={apiErrorMessage(failed?.error)} onRetry={() => { void iv.refetch(); void evals.refetch(); void criteria.refetch(); }} />
      </>
    );
  }

  const d = iv.data;
  const isInterviewer = (d.interviewers ?? []).some((p) => p.interviewerId === me);
  const submitted = !!mine?.submittedAt;
  const jobTitle = posting.data?.title ?? "";
  const range = posting.data?.salaryMin != null || posting.data?.salaryMax != null
    ? formatSalary(posting.data?.salaryMin, posting.data?.salaryMax) : "";

  const openConfirm = () => {
    const v = getValues();
    const errs = [
      !Object.values(v.scores).some((s) => s > 0) && L.errScores,
      !v.recommendation && L.errRecommendation,
      !v.generalComment.trim() && L.errGeneral,
    ].filter(Boolean) as string[];
    setErrors(errs);
    if (errs.length) { notify(errs.join(" · ")); return; }
    setConfirm(true);
  };
  const doSubmit = () => {
    const body = toBody(getValues());
    submit.mutate(
      { ...body, overallRecommendation: body.overallRecommendation ?? "YES", scores: body.scores ?? [] },
      {
        onSuccess: () => {
          setConfirm(false);
          notify(L.done);
          router.replace({ pathname: `/${area}/applications/[id]`, params: { id: String(d.applicationId) } });
        },
        onError: (e) => notify(apiErrorMessage(e)),
      },
    );
  };

  const subtitle = [d.candidateName, jobTitle].filter(Boolean).join(" · ");
  const blocked = submitted ? L.alreadySubmitted
    : !isInterviewer ? L.notInterviewer
      : !EVALUABLE.has(d.status ?? "") ? L.notEvaluable
        : null;

  return (
    <>
      <ScreenHeader variant="compact" back title={L.title} subtitle={subtitle} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, !blocked && { paddingBottom: BOTTOM_BAR_SPACE }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <Card onPress={() => router.push({ pathname: `/${area}/applications/[id]`, params: { id: String(d.applicationId) } })}>
          <View style={styles.row}>
            <Avatar name={d.candidateName} />
            <View style={styles.flex}>
              <Text style={styles.name}>{d.candidateName}</Text>
              <Text style={styles.sub}>
                {`${formatDate(d.scheduledAt)} · ${formatTimeRange(d.scheduledAt, d.durationMinutes)} · ${d.format === "ONLINE" ? S.online : S.onsite}`}
              </Text>
            </View>
            <Text style={styles.link}>CV</Text>
          </View>
        </Card>

        {blocked ? <InfoNote>{blocked}</InfoNote> : others.length ? <InfoNote icon="lock">{L.hiddenOthers(others.join(", "))}</InfoNote> : null}

        {!blocked ? (
          <>
            <Card>
              <CardTitle right={<Text style={styles.avg}>{L.avg(avg ? one(avg) : L.none)}</Text>}>{L.criteria}</CardTitle>
              {list.map((c) => {
                const k = String(c.id);
                const score = values.scores?.[k] ?? 0;
                return (
                  <View key={k} style={styles.criterion}>
                    <Text style={styles.body}>{c.name}</Text>
                    <View style={styles.scores}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable
                          key={n}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: score === n }}
                          accessibilityLabel={`${c.name} ${n}`}
                          onPress={() => setValue(`scores.${k}`, score === n ? 0 : n)}
                          style={[styles.score, score >= n && styles.scoreOn]}
                          hitSlop={SPACING.xs}
                        >
                          <Text style={[styles.scoreText, score >= n && styles.scoreTextOn]}>{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {openComments[k] || !!values.comments?.[k] ? (
                      <TextInput
                        value={values.comments?.[k] ?? ""}
                        onChangeText={(t) => setValue(`comments.${k}`, t)}
                        placeholder={L.commentPlaceholder}
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.comment}
                        multiline
                      />
                    ) : (
                      <Pressable accessibilityRole="button" onPress={() => setOpenComments({ ...openComments, [k]: true })}>
                        <Text style={styles.add}>{L.addComment}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </Card>

            <Card>
              <CardTitle>{`${L.recommendation} *`}</CardTitle>
              <View style={styles.recs}>
                {RECS.map((r) => {
                  const on = values.recommendation === r;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setValue("recommendation", r)}
                      style={[styles.rec, on && (r === "NO" || r === "STRONG_NO" ? styles.recBad : styles.recGood)]}
                    >
                      <Text style={[styles.recText, on && styles.recTextOn]}>{REC[r]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.includes(L.errRecommendation) && !values.recommendation ? <Text style={styles.error}>{L.errRecommendation}</Text> : null}
            </Card>

            <Card>
              <FormTextField
                control={control}
                name="generalComment"
                label={L.general}
                required
                multiline
                placeholder={L.generalPlaceholder}
                message={errors.includes(L.errGeneral) && !values.generalComment?.trim() ? L.errGeneral : undefined}
              />
            </Card>

            <Card>
              <CardTitle>{L.salary}</CardTitle>
              <FormTextField
                control={control}
                name="salary"
                label={`${L.salaryLabel} (₫)`}
                keyboardType="number-pad"
                hint={range ? L.salaryRange(range) : undefined}
              />
              {salaryNoteOpen || !!values.salaryNote ? (
                <FormTextField control={control} name="salaryNote" label={L.salaryNotePlaceholder} multiline />
              ) : (
                <Pressable accessibilityRole="button" onPress={() => setSalaryNoteOpen(true)}>
                  <Text style={styles.add}>{L.addSalaryNote}</Text>
                </Pressable>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>

      {!blocked ? (
        <BottomActionBar>
          <View style={styles.barText}>
            <Text style={styles.sub}>{save.isPending ? L.saving : savedAt ? L.savedAt(savedAt) : ""}</Text>
          </View>
          <PillButton label={L.submit} onPress={openConfirm} style={styles.flex} />
        </BottomActionBar>
      ) : null}

      <BottomSheet
        visible={confirm}
        onDismiss={() => setConfirm(false)}
        title={L.confirmTitle}
        subtitle={L.confirmNote(others.length)}
        footer={
          <View style={styles.sheetActions}>
            <PillButton label={L.review} variant="tonal" onPress={() => setConfirm(false)} style={styles.flex} />
            <PillButton label={L.confirm} loading={submit.isPending} onPress={doSubmit} style={styles.flex} />
          </View>
        }
      >
        <KeyValueRow label={L.recommendation} value={values.recommendation ? REC[values.recommendation] : L.none} />
        <KeyValueRow label={L.avg("").replace(/\s+$/, "")} value={avg ? L.avgOf(one(avg)) : L.none} />
        <KeyValueRow label={L.salary} value={toNumber(values.salary ?? "") != null ? formatMoney(toNumber(values.salary ?? "")) : L.none} last />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  body: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  link: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.primaryDark },
  avg: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.primaryDark },
  criterion: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  scores: { flexDirection: "row", gap: SPACING.sm },
  score: {
    width: SIZES.control - SPACING.xs, height: SIZES.control - SPACING.xs, borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill, alignItems: "center", justifyContent: "center",
  },
  scoreOn: { backgroundColor: COLORS.primary },
  scoreText: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  scoreTextOn: { color: COLORS.cardBg },
  comment: {
    fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textPrimary, backgroundColor: COLORS.fill,
    borderRadius: RADIUS.md, padding: SPACING.sm2, minHeight: SIZES.control,
  },
  add: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.primaryDark },
  recs: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  rec: {
    paddingHorizontal: SPACING.md, height: SIZES.control - SPACING.xs, borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill, alignItems: "center", justifyContent: "center",
  },
  recGood: { backgroundColor: COLORS.success },
  recBad: { backgroundColor: COLORS.error },
  recText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  recTextOn: { color: COLORS.cardBg },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
  barText: { flex: 1, justifyContent: "center" },
  sheetActions: { flexDirection: "row", gap: SPACING.sm },
});
