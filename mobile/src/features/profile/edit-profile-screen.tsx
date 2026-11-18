import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOTTOM_BAR_SPACE, BottomActionBar, ScreenHeader } from "@/components/ui/screen-chrome";
import { PillButton } from "@/components/ui/buttons";
import { Card } from "@/components/ui/surfaces";
import { FilterChips } from "@/components/ui/search-and-filters";
import { RadioList } from "@/components/ui/radio-list";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { FormTextField } from "@/components/form-text-field";
import { apiErrorMessage } from "@/api/client";
import { useEducationLevels } from "@/features/masterdata/hooks";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";
import type { CandidateSelf } from "@/types/api";
import { useMyProfile, useUpdateProfile } from "./hooks";

const S = STRINGS.profile;
type Gender = keyof typeof S.genders;
const GENDERS = (Object.keys(S.genders) as Gender[]).map((g) => ({ key: g, label: S.genders[g] }));

/** "dd/mm/yyyy" ↔ "yyyy-mm-dd" (backend nhận LocalDate ISO). */
const toIso = (dmy: string) => {
  const [d, m, y] = dmy.split("/");
  return `${y}-${m}-${d}`;
};
const toDmy = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
};

const schema = z.object({
  fullName: z.string().trim().min(2, STRINGS.auth.validation.fullNameRequired),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^[0-9+\s().-]{8,20}$/.test(v), S.phoneInvalid),
  dateOfBirth: z
    .string()
    .trim()
    .refine((v) => {
      if (!v) return true;
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
      const d = new Date(toIso(v));
      return !Number.isNaN(d.getTime()) && d < new Date();
    }, S.dobInvalid),
  gender: z.string(),
  address: z.string().trim(),
  currentPosition: z.string().trim(),
  educationLevelId: z.number().optional(),
});
type Values = z.infer<typeof schema>;

const fromProfile = (p: CandidateSelf): Values => ({
  fullName: p.fullName ?? "",
  phone: p.phone ?? "",
  dateOfBirth: toDmy(p.dateOfBirth),
  gender: (p.gender ?? "").toUpperCase(),
  address: p.address ?? "",
  currentPosition: p.currentPosition ?? "",
  educationLevelId: p.educationLevelId,
});

/**
 * Chỉnh sửa hồ sơ — Redesign-Final `views.editProfile` (màn riêng thay cho sheet), BỎ phần kỹ năng (chốt 19/11/2026).
 * Backend GHI ĐÈ toàn bộ hồ sơ, kể cả `skillIds` → luôn gửi lại kỹ năng đang có, không được làm mất.
 */
export function EditProfileScreen() {
  const profile = useMyProfile();
  return (
    <View style={styles.root}>
      <ScreenHeader variant="compact" back title={S.editTitle} />
      {profile.isPending ? (
        <View style={styles.pad}>
          <SkeletonList count={2} />
        </View>
      ) : profile.isError ? (
        <View style={styles.pad}>
          <ErrorState message={apiErrorMessage(profile.error, "")} onRetry={() => void profile.refetch()} />
        </View>
      ) : (
        <EditForm profile={profile.data} />
      )}
    </View>
  );
}

function EditForm({ profile }: { profile: CandidateSelf }) {
  const notify = useSnackbar();
  const update = useUpdateProfile();
  const levels = useEducationLevels();
  const insets = useSafeAreaInsets();

  const { control, handleSubmit, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: fromProfile(profile),
  });
  const gender = useWatch({ control, name: "gender" });
  const educationLevelId = useWatch({ control, name: "educationLevelId" });

  const onSave = handleSubmit((v) =>
    update.mutate(
      {
        fullName: v.fullName,
        phone: v.phone || undefined,
        dateOfBirth: v.dateOfBirth ? toIso(v.dateOfBirth) : undefined,
        gender: v.gender || undefined,
        address: v.address || undefined,
        currentPosition: v.currentPosition || undefined,
        educationLevelId: v.educationLevelId,
        skillIds: profile.skillIds ?? [],
      },
      {
        onSuccess: () => {
          notify(S.saved);
          router.back();
        },
        onError: (e) => notify(apiErrorMessage(e, S.saveFailed)),
      }
    )
  );

  return (
    <>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <Card style={styles.card}>
            <FormTextField
              control={control}
              name="fullName"
              label={S.fullName}
              required
              message={formState.errors.fullName?.message}
              autoCapitalize="words"
            />
            <FormTextField
              control={control}
              name="phone"
              label={S.phone}
              message={formState.errors.phone?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <FormTextField
              control={control}
              name="dateOfBirth"
              label={S.dateOfBirth}
              placeholder={S.dobPlaceholder}
              message={formState.errors.dateOfBirth?.message}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <View style={styles.field}>
              <Text style={styles.label}>{S.gender}</Text>
              <FilterChips
                options={GENDERS}
                value={gender as Gender}
                onChange={(g) => setValue("gender", g === gender ? "" : g)}
              />
            </View>
            <FormTextField control={control} name="currentPosition" label={S.currentPosition} />
            <FormTextField control={control} name="address" label={S.address} />
            <View style={styles.field}>
              <Text style={styles.label}>{S.education}</Text>
              <RadioList
                options={(levels.data ?? []).filter((l) => l.id != null).map((l) => ({ id: l.id!, label: l.name ?? "" }))}
                value={educationLevelId}
                onChange={(id) => setValue("educationLevelId", id === educationLevelId ? undefined : id)}
                loading={levels.isPending}
                error={levels.isError}
                onRetry={() => void levels.refetch()}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomActionBar>
        <PillButton label={S.cancel} variant="outline" onPress={() => router.back()} />
        <PillButton label={S.save} fullWidth style={styles.flex} loading={update.isPending} onPress={() => void onSave()} />
      </BottomActionBar>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  flex: { flex: 1 },
  pad: { padding: SPACING.page },
  content: { paddingHorizontal: SPACING.page, paddingTop: SPACING.xs },
  card: { gap: SPACING.md },
  field: { gap: SPACING.xs + SPACING.xxs },
  label: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.caption, color: COLORS.textSecondary },
});
