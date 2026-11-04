import { StyleSheet, Text } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { RadioList } from "@/components/ui/radio-list";
import { useSnackbar } from "@/components/ui/snackbar";
import { useWithdrawApplication } from "@/features/applications/hooks";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE } from "@/theme";
import { useDeclineInterview } from "./hooks";

const S = STRINGS.interviews.decline;

/** RadioList cần id số: 1 = xin dời lịch, 2 = không tham gia nữa (rút đơn). */
const RESCHEDULE = 1;
const WITHDRAW = 2;

const schema = z
  .object({ choice: z.number(), reason: z.string().max(500) })
  .refine((v) => v.choice !== RESCHEDULE || v.reason.trim().length > 0, {
    path: ["reason"],
    message: S.reasonRequired,
  });
type Values = z.infer<typeof schema>;

/**
 * Ứng viên từ chối lịch phỏng vấn (lịch 1 giờ cố định — quyết định 04/11/2026, cùng luồng với web C14):
 * "Xin dời lịch" kèm lý do (HR đặt giờ mới) hoặc "Không tham gia nữa" (rút đơn, không hoàn tác).
 */
export function DeclineInterviewSheet({
  visible,
  onDismiss,
  interviewId,
  applicationId,
}: {
  visible: boolean;
  onDismiss: () => void;
  interviewId: number;
  applicationId: number;
}) {
  const notify = useSnackbar();
  const decline = useDeclineInterview();
  const withdraw = useWithdrawApplication(applicationId);
  const { control, handleSubmit, setValue, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { choice: RESCHEDULE, reason: "" },
  });
  const choice = useWatch({ control, name: "choice" });

  const close = () => {
    reset({ choice: RESCHEDULE, reason: "" });
    onDismiss();
  };

  const onSubmit = handleSubmit((v) => {
    const done = (msg: string) => {
      close();
      notify(msg);
    };
    if (v.choice === RESCHEDULE) {
      decline.mutate(
        { id: interviewId, reason: v.reason.trim() },
        { onSuccess: () => done(S.rescheduled), onError: (e) => notify(apiErrorMessage(e, S.failed)) },
      );
    } else {
      withdraw.mutate(undefined, {
        onSuccess: () => done(S.withdrawn),
        onError: (e) => notify(apiErrorMessage(e, S.failed)),
      });
    }
  });

  return (
    <BottomSheet
      visible={visible}
      onDismiss={close}
      title={S.title}
      footer={
        <PillButton
          label={choice === RESCHEDULE ? S.sendReschedule : S.sendWithdraw}
          variant={choice === RESCHEDULE ? "primary" : "danger"}
          fullWidth
          loading={decline.isPending || withdraw.isPending}
          onPress={onSubmit}
        />
      }
    >
      <RadioList
        options={[
          { id: RESCHEDULE, label: S.reschedule },
          { id: WITHDRAW, label: S.withdraw },
        ]}
        value={choice}
        onChange={(id) => setValue("choice", id, { shouldValidate: true })}
      />
      <Text style={styles.hint}>{choice === RESCHEDULE ? S.rescheduleHint : S.withdrawHint}</Text>
      {choice === RESCHEDULE ? (
        <FormTextField control={control} name="reason" label={S.reason} placeholder={S.reasonPlaceholder} message={formState.errors.reason?.message} multiline maxLength={500} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: FONT.regular, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
});
