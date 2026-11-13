import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { Avatar } from "@/components/ui/avatar";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { useSnackbar } from "@/components/ui/snackbar";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardTitle, InfoNote, KeyValueRow } from "@/components/ui/surfaces";
import { useDepartmentNames } from "@/features/masterdata/hooks";
import { formatDate, formatSalary } from "@/lib/format";
import { requisitionStatus } from "@/lib/status";
import { STRINGS } from "@/lib/strings";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";
import type { RequisitionResponse, RequisitionUpdateRequest } from "@/types/api";
import { useMyId, useSaveRequisition, useStaffRequisition } from "../hooks";

const L = STRINGS.staff.requisition;
const ARR = STRINGS.arrangement;
const ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;
const REASON = STRINGS.staff.requisitionReason;
const code = (id?: number) => `REQ-${String(id ?? 0).padStart(3, "0")}`;

/** "15/12/2026" → "2026-12-15"; sai dạng → null. */
function toIsoDate(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const millionsIn = (n?: number) => (n != null ? String(Math.round(n / 1_000_000)) : "");
const millionsOut = (s: string) => (s.trim() ? Number(s.replace(/\D/g, "")) * 1_000_000 : undefined);

const schema = z
  .object({
    title: z.string().trim().min(1, L.errTitle).max(200),
    quantity: z.string().regex(/^\d+$/, L.errQuantity).refine((v) => Number(v) >= 1, L.errQuantity),
    needBy: z.string().refine((v) => !v.trim() || toIsoDate(v) != null, L.errDate),
    salaryFrom: z.string().max(6),
    salaryTo: z.string().max(6),
    arrangement: z.enum(ARRANGEMENTS).nullable(),
    requirements: z.string().max(3000),
    note: z.string().max(2000),
  })
  .refine((v) => !v.salaryFrom || !v.salaryTo || Number(v.salaryFrom) <= Number(v.salaryTo), { path: ["salaryTo"], message: L.errSalary });
type Values = z.infer<typeof schema>;

/**
 * Chi tiết yêu cầu tuyển dụng (UR11 / UH12) · UH13 sửa yêu cầu "Cần sửa" hoặc bản nháp của chính Đại diện phòng
 * ban. Backend ghi đè cả yêu cầu (PUT) nên các trường không có trên mobile giữ nguyên giá trị đang có. Chuyên viên
 * tuyển dụng chỉ xem — duyệt / yêu cầu sửa / từ chối làm trên máy tính (DS06).
 */
export function StaffRequisitionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reqId = Number(id);
  const role = useAuthStore((s) => s.user?.role);
  const isHr = role !== "HIRING_MANAGER";
  const me = useMyId();
  const q = useStaffRequisition(reqId);
  const depts = useDepartmentNames();

  if (q.isPending) return (<><ScreenHeader variant="compact" back title={L.title} /><SkeletonList /></>);
  if (q.isError || !q.data) {
    return (
      <>
        <ScreenHeader variant="compact" back title={L.title} />
        <ErrorState message={apiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      </>
    );
  }
  const r = q.data;
  const editable = !isHr && r.requesterId === me && (r.status === "CHANGES_REQUESTED" || r.status === "DRAFT");
  return editable ? <EditRequisition r={r} /> : <ViewRequisition r={r} isHr={isHr} dept={depts.get(r.departmentId ?? 0) ?? ""} />;
}

function ViewRequisition({ r, isHr, dept }: { r: RequisitionResponse; isHr: boolean; dept: string }) {
  const proposed = r.expectedSalaryMin != null || r.expectedSalaryMax != null ? formatSalary(r.expectedSalaryMin, r.expectedSalaryMax) : "—";
  return (
    <>
      <ScreenHeader variant="compact" back title={L.title} subtitle={code(r.id)} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.top}>
            <Text style={styles.title}>{r.title}</Text>
            <StatusChip {...requisitionStatus(r.status)} />
          </View>
          <View style={styles.person}>
            <Avatar name={r.requesterName} size={SPACING.lg} />
            <Text style={styles.sub}>{[r.requesterName, dept].filter(Boolean).join(" · ")}</Text>
          </View>
        </Card>

        {isHr && r.status === "PENDING_APPROVAL" ? <InfoNote>{L.approveOnWeb}</InfoNote> : null}
        {r.status === "CHANGES_REQUESTED" && r.hrNote ? (
          <Card><CardTitle>{L.hrComment}</CardTitle><Text style={styles.body}>{`“${r.hrNote}”`}</Text></Card>
        ) : null}
        {r.status === "REJECTED" && r.rejectReason ? (
          <Card><CardTitle>{L.rejectReason}</CardTitle><Text style={styles.body}>{r.rejectReason}</Text></Card>
        ) : null}

        <Card>
          <CardTitle>{L.info}</CardTitle>
          <KeyValueRow label={L.quantity} value={STRINGS.staff.requisitions.people(r.quantity ?? 0)} />
          <KeyValueRow label={L.arrangement} value={r.workArrangement ? ARR[r.workArrangement] : "—"} />
          <KeyValueRow label={L.startDate} value={formatDate(r.expectedStartDate)} />
          <KeyValueRow label={L.proposed} value={proposed} last={r.status !== "APPROVED"} />
          {r.status === "APPROVED" ? (
            <KeyValueRow label={L.approved} value={formatSalary(r.approvedSalaryMin, r.approvedSalaryMax)} last />
          ) : null}
        </Card>

        {r.reason || r.note ? (
          <Card>
            <CardTitle>{L.reasonFor}</CardTitle>
            {r.reason ? <Text style={styles.strong}>{REASON[r.reason]}</Text> : null}
            {r.note ? <Text style={styles.body}>{r.note}</Text> : null}
          </Card>
        ) : null}
        {r.description ? <Card><CardTitle>{L.description}</CardTitle><Text style={styles.body}>{r.description}</Text></Card> : null}
        {r.requirements ? <Card><CardTitle>{L.requirements}</CardTitle><Text style={styles.body}>{r.requirements}</Text></Card> : null}
      </ScrollView>
    </>
  );
}

function EditRequisition({ r }: { r: RequisitionResponse }) {
  const notify = useSnackbar();
  const save = useSaveRequisition(r.id ?? 0);
  const fix = r.status === "CHANGES_REQUESTED";
  const { control, handleSubmit, setValue, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: r.title ?? "",
      quantity: String(r.quantity ?? 1),
      needBy: r.expectedStartDate ? formatDate(r.expectedStartDate) : "",
      salaryFrom: millionsIn(r.expectedSalaryMin),
      salaryTo: millionsIn(r.expectedSalaryMax),
      arrangement: (r.workArrangement as Values["arrangement"]) ?? null,
      requirements: r.requirements ?? "",
      note: r.note ?? "",
    },
  });
  // Dữ liệu tải lại (sau khi lưu) → nạp lại form.
  useEffect(() => {
    reset({
      title: r.title ?? "", quantity: String(r.quantity ?? 1),
      needBy: r.expectedStartDate ? formatDate(r.expectedStartDate) : "",
      salaryFrom: millionsIn(r.expectedSalaryMin), salaryTo: millionsIn(r.expectedSalaryMax),
      arrangement: (r.workArrangement as Values["arrangement"]) ?? null,
      requirements: r.requirements ?? "", note: r.note ?? "",
    });
  }, [r, reset]);
  const arrangement = useWatch({ control, name: "arrangement" });
  const e = formState.errors;

  const send = (submit: boolean) =>
    handleSubmit((v) => {
      const body: RequisitionUpdateRequest = {
        title: v.title.trim(),
        departmentId: r.departmentId ?? 0,
        jobTitleId: r.jobTitleId ?? 0,
        jobLevelId: r.jobLevelId,
        quantity: Number(v.quantity),
        employmentTypeId: r.employmentTypeId,
        workLocationId: r.workLocationId,
        workArrangement: v.arrangement ?? undefined,
        experienceRequired: r.experienceRequired,
        reason: r.reason,
        priority: r.priority,
        note: v.note.trim() || undefined,
        budget: r.budget,
        expectedSalaryMin: millionsOut(v.salaryFrom),
        expectedSalaryMax: millionsOut(v.salaryTo),
        expectedStartDate: v.needBy.trim() ? (toIsoDate(v.needBy) ?? undefined) : undefined,
        description: r.description,
        requirements: v.requirements.trim() || undefined,
        benefits: r.benefits,
        skillIds: r.skillIds ?? [],
        approverId: r.approverId ?? 0,
      };
      save.mutate(
        { body, submit },
        {
          onSuccess: () => {
            notify(submit ? L.submitted : L.saved);
            if (submit) router.back();
          },
          onError: (err) => notify(apiErrorMessage(err)),
        },
      );
    })();

  return (
    <>
      <ScreenHeader variant="compact" back title={L.editTitle} subtitle={fix ? L.editSub(code(r.id)) : L.draftSub(code(r.id))} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {fix ? (
          <Card>
            <View style={styles.person}>
              <Avatar name={r.approverName} size={SPACING.xl} />
              <Text style={[styles.strong, styles.flex]}>{L.askedBy(r.approverName ?? "")}</Text>
            </View>
            {r.hrNote ? <Text style={styles.quote}>{`“${r.hrNote}”`}</Text> : null}
          </Card>
        ) : null}

        <Card>
          <CardTitle>{L.info}</CardTitle>
          <FormTextField control={control} name="title" label={L.position} required message={e.title?.message} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <FormTextField control={control} name="quantity" label={L.quantity} required keyboardType="number-pad" message={e.quantity?.message} />
            </View>
            <View style={styles.flex}>
              <FormTextField control={control} name="needBy" label={L.needBy} placeholder="dd/mm/yyyy" message={e.needBy?.message} />
            </View>
          </View>
          <Text style={styles.label}>{L.salary}</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <FormTextField control={control} name="salaryFrom" label={L.salaryFrom} keyboardType="number-pad" />
            </View>
            <View style={styles.flex}>
              <FormTextField control={control} name="salaryTo" label={L.salaryTo} keyboardType="number-pad" message={e.salaryTo?.message} />
            </View>
          </View>
          <Text style={styles.label}>{L.arrangement}</Text>
          <View style={styles.chips}>
            {ARRANGEMENTS.map((k) => {
              const on = arrangement === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setValue("arrangement", k, { shouldDirty: true })}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{ARR[k]}</Text>
                </Pressable>
              );
            })}
          </View>
          <FormTextField control={control} name="requirements" label={L.skills} multiline />
          <FormTextField control={control} name="note" label={L.reason} multiline />
        </Card>
      </ScrollView>
      <BottomActionBar>
        <PillButton label={L.saveDraft} variant="tonal" loading={save.isPending && !save.variables?.submit} onPress={() => send(false)} style={styles.flex} />
        <PillButton label={fix ? L.resubmit : L.submit} loading={save.isPending && !!save.variables?.submit} onPress={() => send(true)} style={styles.flex} />
      </BottomActionBar>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  top: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  title: { flex: 1, fontFamily: FONT.semibold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: SPACING.sm2 },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  body: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  strong: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  quote: { fontFamily: FONT.regular, fontSize: FONT_SIZE.base, color: COLORS.textPrimary, fontStyle: "italic" },
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, height: SIZES.control - SPACING.xs, borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill, alignItems: "center", justifyContent: "center",
  },
  chipOn: { backgroundColor: COLORS.primary },
  chipText: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  chipTextOn: { color: COLORS.cardBg },
});
