import { StyleSheet, Text, View } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { RadioList } from "@/components/ui/radio-list";
import { useSnackbar } from "@/components/ui/snackbar";
import { InfoNote } from "@/components/ui/surfaces";
import { useRejectionReasons } from "@/features/masterdata/hooks";
import { MAIN_STAGES, toFixedStage } from "@/lib/stages";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACING } from "@/theme";
import type { ApplicationResponse } from "@/types/api";
import { useAdvanceToNextStage, useRejectApplication } from "./hooks";

const S = STRINGS.staff;

/** Giai đoạn cố định kế tiếp theo thứ tự DS06 (để hiển thị; số bước thật tính lúc chuyển). */
export function nextStageOf(app: ApplicationResponse) {
  const i = MAIN_STAGES.indexOf(toFixedStage(app.currentStageType));
  return i >= 0 ? MAIN_STAGES[i + 1] : undefined;
}

/**
 * UR05 · Chuyển giai đoạn. Backend chỉ cho đi tới (không có "quay lại bước trước" của HTML → bỏ).
 * "Đã tuyển" chỉ bật khi ứng viên đã nhận thư mời.
 */
export function MoveStageSheet({
  app,
  visible,
  onDismiss,
  pendingNames,
  offerAccepted,
}: {
  app: ApplicationResponse;
  visible: boolean;
  onDismiss: () => void;
  pendingNames: string[];
  offerAccepted: boolean;
}) {
  const notify = useSnackbar();
  const advance = useAdvanceToNextStage();
  const next = nextStageOf(app);
  const current = S.stage[toFixedStage(app.currentStageType)];
  const blocked = next === "HIRED" && !offerAccepted;
  const hint =
    next === "OFFER"
      ? S.move.offerHint
      : next === "HIRED"
        ? S.move.hiredHint
        : undefined;

  const onMove = () =>
    app.id != null &&
    advance.mutate(
      { applicationId: app.id },
      {
        onSuccess: (target) => {
          onDismiss();
          notify(S.move.done(S.stage[target]));
        },
        onError: (e) => notify(apiErrorMessage(e, S.move.failed)),
      },
    );

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={S.move.title(app.candidateName ?? "")}
      subtitle={
        S.move.current(current) +
        (pendingNames.length ? S.move.pending(pendingNames.join(", ")) : "")
      }
      footer={
        <View style={styles.footer}>
          <PillButton
            label={S.reject.cancel}
            variant="tonal"
            onPress={onDismiss}
            style={styles.flex}
          />
          <PillButton
            label={S.move.confirm}
            onPress={onMove}
            loading={advance.isPending}
            disabled={!next || blocked}
            style={styles.flex}
          />
        </View>
      }
    >
      {next ? (
        <View style={[styles.option, blocked && styles.optionOff]}>
          <Text style={styles.optionTitle}>{S.stage[next]}</Text>
          {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
        </View>
      ) : (
        <InfoNote>{S.move.noNext}</InfoNote>
      )}
    </BottomSheet>
  );
}

const rejectSchema = z.object({
  rejectionReasonId: z.number({ message: S.reject.reasonRequired }),
  note: z.string().max(500),
});
type RejectValues = z.infer<typeof rejectSchema>;

/** UR06 · Từ chối ứng viên: lý do bắt buộc, ghi chú nội bộ; ứng viên nhận email không kèm lý do. */
export function RejectSheet({
  app,
  visible,
  onDismiss,
}: {
  app: ApplicationResponse;
  visible: boolean;
  onDismiss: () => void;
}) {
  const notify = useSnackbar();
  const reject = useRejectApplication();
  const reasons = useRejectionReasons();
  const { control, handleSubmit, setValue, reset, formState } =
    useForm<RejectValues>({
      resolver: zodResolver(rejectSchema),
      defaultValues: { note: "" },
    });
  const reasonId = useWatch({ control, name: "rejectionReasonId" });

  const close = () => {
    reset({ note: "" });
    onDismiss();
  };

  const onReject = handleSubmit((v) =>
    reject.mutate(
      {
        applicationId: app.id ?? 0,
        body: {
          rejectionReasonId: v.rejectionReasonId,
          note: v.note || undefined,
        },
      },
      {
        onSuccess: () => {
          close();
          notify(S.reject.done(app.candidateName ?? ""));
        },
        onError: (e) => notify(apiErrorMessage(e)),
      },
    ),
  );

  return (
    <BottomSheet
      visible={visible}
      onDismiss={close}
      title={S.reject.title(app.candidateName ?? "")}
      subtitle={S.reject.email}
      footer={
        <PillButton
          label={S.reject.confirm}
          variant="danger"
          fullWidth
          loading={reject.isPending}
          onPress={onReject}
        />
      }
    >
      <Text style={styles.label}>{S.reject.reason}</Text>
      <RadioList
        options={(reasons.data ?? []).map((r) => ({
          id: r.id ?? 0,
          label: r.name ?? "",
        }))}
        value={reasonId}
        onChange={(id) =>
          setValue("rejectionReasonId", id, { shouldValidate: true })
        }
        loading={reasons.isPending}
        error={reasons.isError}
        onRetry={() => void reasons.refetch()}
      />
      {formState.errors.rejectionReasonId ? (
        <Text style={styles.error}>
          {formState.errors.rejectionReasonId.message}
        </Text>
      ) : null}
      <FormTextField
        control={control}
        name="note"
        label={S.reject.note}
        placeholder={S.reject.notePlaceholder}
        multiline
        maxLength={500}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", gap: SPACING.sm2 },
  flex: { flex: 1 },
  option: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryFaint,
    gap: SPACING.xxs,
  },
  optionOff: { backgroundColor: COLORS.fill },
  optionTitle: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  optionHint: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
  },
  label: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  error: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.xs,
    color: COLORS.errorText,
  },
});
