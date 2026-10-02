import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { useApply } from "@/features/applications/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { useRecruitmentSources } from "@/features/masterdata/hooks";
import { SourceSheet } from "@/features/applications/source-sheet";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { useSnackbar } from "@/components/ui/snackbar";
import { FormTextField } from "@/components/form-text-field";
import { STRINGS } from "@/lib/strings";
import { cvFileName } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, RADIUS, SIZES, SPACING } from "@/theme";

const S = STRINGS.apply;
const D = STRINGS.jobDetail;

const schema = z.object({
  recruitmentSourceId: z.number({ error: D.sourceRequired }).int().positive(D.sourceRequired),
  note: z.string().trim().max(1000).optional(),
});
type Values = z.infer<typeof schema>;

/**
 * Ứng tuyển — giao diện canvas Mobile v2 N28, cắt theo đúng những gì backend nhận:
 * `ApplicationCreateRequest` chỉ có jobPostingId + recruitmentSourceId (bắt buộc) + note.
 * CV lấy từ hồ sơ (không đính kèm). Các ô họ tên/SĐT/lương mong muốn và "AI tự điền" của canvas
 * KHÔNG làm — backend không nhận các trường đó.
 */
export default function ApplyScreen() {
  const { jobId: jobIdParam } = useLocalSearchParams<{ jobId: string }>();
  const jobId = Number(jobIdParam);
  const job = useJob(jobId);
  const profile = useMyProfile();
  const sources = useRecruitmentSources();
  const apply = useApply();
  const notify = useSnackbar();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { control, handleSubmit, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { note: "" },
  });
  const sourceId = useWatch({ control, name: "recruitmentSourceId" });
  const sourceName = sources.data?.find((s) => s.id === sourceId)?.name;
  const hasCv = !!profile.data?.resumeUploaded;
  const cvName = cvFileName(profile.data?.resumeUrl);

  const onSubmit = handleSubmit(
    (v) =>
      apply.mutate(
        { jobPostingId: jobId, recruitmentSourceId: v.recruitmentSourceId, note: v.note || undefined },
        {
          onSuccess: () => {
            notify(D.success);
            router.navigate("/applications");
          },
          onError: (e) => {
            const msg = apiErrorMessage(e, D.failed);
            // Backend: "Ứng viên chưa có CV…" → dẫn thẳng tới chỗ tải CV.
            const noCv = /\bCV\b/i.test(msg);
            notify(msg, noCv ? { label: D.uploadCv, onPress: () => router.navigate("/profile") } : undefined);
          },
        }
      ),
    // Chưa chọn nguồn → mở luôn sheet chọn nguồn thay vì chỉ báo lỗi.
    () => setSheetOpen(true)
  );

  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.title} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {job.data?.title ? <Text style={styles.jobTitle}>{job.data.title}</Text> : null}

          {/* Thẻ CV (canvas N28): tên file trong hồ sơ, nút "Đổi" sang mục Tôi để thay. */}
          <View style={[styles.cvCard, !hasCv && styles.cvCardMissing]}>
            <IconTile icon="file" tone={hasCv ? "danger" : "neutral"} size={SIZES.iconButton} />
            <View style={styles.flex}>
              <Text style={styles.cvName} numberOfLines={1}>
                {hasCv ? cvName : S.noCv}
              </Text>
              <Text style={styles.sub}>{hasCv ? S.cvFromProfile : S.noCvHint}</Text>
            </View>
            <PillButton
              label={hasCv ? S.changeCv : S.uploadCv}
              variant={hasCv ? "text" : "primary"}
              size="sm"
              onPress={() => router.navigate("/profile")}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              {S.source}
              <Text style={styles.required}>{STRINGS.common.required}</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={S.source}
              onPress={() => setSheetOpen(true)}
              style={[styles.select, formState.errors.recruitmentSourceId && styles.selectError]}
            >
              <Text style={[styles.selectText, !sourceName && styles.placeholder]} numberOfLines={1}>
                {sourceName ?? S.sourcePlaceholder}
              </Text>
              <Icon name="chevronDown" size={SIZES.iconSm} color={COLORS.textSecondary} />
            </Pressable>
            {formState.errors.recruitmentSourceId ? (
              <Text style={styles.error}>{formState.errors.recruitmentSourceId.message}</Text>
            ) : null}
          </View>

          <FormTextField control={control} name="note" label={S.note} multiline maxLength={1000} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomActionBar>
        <PillButton
          label={S.submit}
          icon="send"
          fullWidth
          style={styles.flex}
          loading={apply.isPending}
          onPress={() => void onSubmit()}
        />
      </BottomActionBar>

      <SourceSheet
        visible={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
        selectedId={sourceId}
        onSelect={(id) => {
          setValue("recruitmentSourceId", id, { shouldValidate: true });
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1 },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.md },
  jobTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  cvCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm2,
    padding: SPACING.sm2 + SPACING.xxs,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.cardBg,
  },
  cvCardMissing: { borderWidth: SIZES.hairline * 2, borderColor: COLORS.error },
  cvName: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  field: { gap: SPACING.sm },
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  required: { color: COLORS.error },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    height: SIZES.control,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.fill,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  selectError: { borderColor: COLORS.error },
  selectText: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  placeholder: { color: COLORS.textMuted },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
});
