import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { FilterChips } from "@/components/ui/search-and-filters";
import { RadioList } from "@/components/ui/radio-list";
import { useSnackbar } from "@/components/ui/snackbar";
import { FormTextField } from "@/components/form-text-field";
import { apiErrorMessage } from "@/api/client";
import { useEducationLevels } from "@/features/masterdata/hooks";
import { STRINGS } from "@/lib/strings";
import { COLORS, FONT, FONT_SIZE } from "@/theme";
import type { CandidateSelf } from "@/types/api";
import { useUpdateProfile } from "./hooks";

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
 * Sheet sửa thông tin cá nhân (M13). Backend GHI ĐÈ toàn bộ hồ sơ, nên gửi đủ mọi trường —
 * kể cả `skillIds` đang có (mobile chưa sửa kỹ năng, nhưng không được làm mất kỹ năng cũ).
 */
export function EditProfileSheet({
  visible,
  onDismiss,
  profile,
}: {
  visible: boolean;
  onDismiss: () => void;
  profile: CandidateSelf;
}) {
  const notify = useSnackbar();
  const update = useUpdateProfile();
  const levels = useEducationLevels();

  const { control, handleSubmit, reset, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: fromProfile(profile),
  });
  const gender = useWatch({ control, name: "gender" });
  const educationLevelId = useWatch({ control, name: "educationLevelId" });

  // Mở lại sheet → nạp lại từ hồ sơ mới nhất (bỏ những gì gõ dở lần trước).
  useEffect(() => {
    if (visible) reset(fromProfile(profile));
  }, [visible, profile, reset]);

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
          onDismiss();
          notify(S.saved);
        },
        onError: (e) => notify(apiErrorMessage(e, S.saveFailed)),
      }
    )
  );

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={S.editTitle}
      footer={<PillButton label={S.save} fullWidth loading={update.isPending} onPress={onSave} />}
    >
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

      <Text style={styles.label}>{S.gender}</Text>
      <FilterChips
        options={GENDERS}
        value={gender as Gender}
        onChange={(g) => setValue("gender", g === gender ? "" : g)}
      />

      <FormTextField control={control} name="currentPosition" label={S.currentPosition} />
      <FormTextField control={control} name="address" label={S.address} />

      <Text style={styles.label}>{S.education}</Text>
      <RadioList
        options={(levels.data ?? []).filter((l) => l.id != null).map((l) => ({ id: l.id!, label: l.name ?? "" }))}
        value={educationLevelId}
        onChange={(id) => setValue("educationLevelId", id === educationLevelId ? undefined : id)}
        loading={levels.isPending}
        error={levels.isError}
        onRetry={() => void levels.refetch()}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
});
