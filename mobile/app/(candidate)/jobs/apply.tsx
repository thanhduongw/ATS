import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJob } from "@/features/jobs/hooks";
import { useApply } from "@/features/applications/hooks";
import { useMyProfile } from "@/features/profile/hooks";
import { useRecruitmentSources } from "@/features/masterdata/hooks";
import { apiErrorMessage } from "@/api/client";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { Card, Divider, Eyebrow, IconTile } from "@/components/ui/surfaces";
import { PillButton } from "@/components/ui/buttons";
import { Checkbox } from "@/components/ui/checkbox";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { cvFileName } from "@/lib/format";
import { COLORS, FONT, FONT_SIZE, LINE_HEIGHT, RADIUS, SIZES, SPACING } from "@/theme";

const S = STRINGS.apply;
const D = STRINGS.jobDetail;

const schema = z.object({
  // Backend bắt buộc ứng viên đồng ý xử lý dữ liệu cá nhân khi tự nộp đơn (giống web).
  consent: z.boolean().refine((v) => v, S.consentRequired),
});
type Values = z.infer<typeof schema>;

/**
 * Xác nhận ứng tuyển — Redesign-Final `views.apply`: thẻ vị trí + CV trong hồ sơ, ô đồng ý xử lý dữ liệu,
 * hộp "Trước khi gửi hồ sơ"; dưới đáy "Quay lại" · "Gửi hồ sơ ứng tuyển".
 * 26/11/2026: bỏ ô "Bạn biết tin từ đâu" và "Lời nhắn" cho giống web — nguồn tuyển (backend bắt buộc) tự lấy
 * "Trang tuyển dụng của công ty" như web (`ApplyJobPage`). CV lấy từ hồ sơ (không đính kèm).
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

  const { control, handleSubmit, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false },
  });
  const consent = useWatch({ control, name: "consent" });
  // Cùng quy tắc với web: ưu tiên nguồn "Trang tuyển dụng / website", không có thì nguồn đầu tiên.
  const activeSources = (sources.data ?? []).filter((s) => s.active !== false);
  const sourceId = (activeSources.find((s) => /website|trang tuyển dụng|career/i.test(String(s.name))) ?? activeSources[0])?.id;
  const hasCv = !!profile.data?.resumeUploaded;
  const cvName = cvFileName(profile.data?.resumeUrl);
  const place = [job.data?.departmentName, job.data?.workLocationName].filter(Boolean).join(" · ");

  const onSubmit = handleSubmit(
    (v) => {
      if (sourceId == null) {
        notify(S.sourceUnavailable);
        return;
      }
      apply.mutate(
        {
          jobPostingId: jobId,
          recruitmentSourceId: sourceId,
          consentAccepted: v.consent,
        },
        {
          onSuccess: (created) => {
            notify(D.success);
            // Redesign-Final: nộp xong mở luôn chi tiết đơn vừa tạo.
            if (created.id != null) router.replace({ pathname: "/applications/[id]", params: { id: String(created.id) } });
            else router.navigate("/applications");
          },
          onError: (e) => {
            const msg = apiErrorMessage(e, D.failed);
            // Backend: "Ứng viên chưa có CV…" → dẫn thẳng tới chỗ tải CV.
            const noCv = /\bCV\b/i.test(msg);
            notify(msg, noCv ? { label: D.uploadCv, onPress: () => router.navigate("/profile") } : undefined);
          },
        }
      );
    },
    // Thiếu đồng ý → nhắc bằng snackbar.
    (errs) => {
      if (errs.consent) notify(S.consentRequired);
    }
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
          {/* Thẻ vị trí + CV: tên file trong hồ sơ, nút "Đổi CV" sang mục Cá nhân để thay. */}
          <Card style={!hasCv && styles.cardMissing}>
            <Eyebrow>{S.positionKicker}</Eyebrow>
            {job.data ? (
              <View style={styles.position}>
                <Text style={styles.jobTitle}>{job.data.title}</Text>
                {place ? <Text style={styles.sub}>{place}</Text> : null}
              </View>
            ) : null}
            <Divider />
            <View style={styles.cvRow}>
              <IconTile icon="file" tone={hasCv ? "brand" : "danger"} size={SIZES.iconButton} />
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
          </Card>

          <Checkbox
            checked={!!consent}
            onChange={(next) => setValue("consent", next, { shouldValidate: formState.isSubmitted })}
            label={S.consent}
          />

          <View style={styles.before}>
            <Text style={styles.beforeTitle}>{S.beforeTitle}</Text>
            <Text style={styles.sub}>{S.beforeBody}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomActionBar>
        <PillButton label={S.back} variant="outline" onPress={() => router.back()} />
        <PillButton
          label={S.submit}
          fullWidth
          style={styles.flex}
          loading={apply.isPending}
          onPress={() => void onSubmit()}
        />
      </BottomActionBar>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1 },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs, gap: SPACING.md },
  cardMissing: { borderColor: COLORS.error },
  position: { gap: SPACING.xxs },
  jobTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  cvRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  cvName: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.base, color: COLORS.textPrimary },
  sub: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.caption,
    lineHeight: FONT_SIZE.caption * LINE_HEIGHT.body,
    color: COLORS.textSecondary,
  },
  field: { gap: SPACING.xs + SPACING.xxs },
  label: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
  required: { color: COLORS.error },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    height: SIZES.control,
    paddingHorizontal: SPACING.sm2,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.cardBg,
    borderWidth: SIZES.border,
    borderColor: COLORS.border,
  },
  selectError: { borderColor: COLORS.error },
  selectText: { flex: 1, fontFamily: FONT.regular, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  placeholder: { color: COLORS.textMuted },
  hint: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  error: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.errorText },
  // Hộp "Trước khi gửi hồ sơ" (`.card` nền phớt màu thương hiệu).
  before: { gap: SPACING.xs, padding: SPACING.md, borderRadius: RADIUS.xl, backgroundColor: COLORS.primaryFaint },
  beforeTitle: { fontFamily: FONT.bold, fontSize: FONT_SIZE.caption, color: COLORS.primaryDark },
});
