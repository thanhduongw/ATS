import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { Avatar } from "@/components/ui/avatar";
import { PillButton } from "@/components/ui/buttons";
import { ErrorState, SkeletonList } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-chrome";
import { useSnackbar } from "@/components/ui/snackbar";
import { Card, CardTitle } from "@/components/ui/surfaces";
import { STRINGS } from "@/lib/strings";
import { useSignOut } from "@/lib/use-sign-out";
import { useAuthStore } from "@/store/authStore";
import { COLORS, FONT, FONT_SIZE, SIZES, SPACING } from "@/theme";
import { ChangePasswordSheet } from "@/features/account/change-password-sheet";
import { useCompanyName, useMe, useUpdateProfile } from "../hooks";

const L = STRINGS.staff.settings;

const profileSchema = z.object({
  fullName: z.string().trim().min(1, L.errName).max(150),
  phone: z.string().trim().refine((v) => !v || /^[0-9+ .()-]{8,20}$/.test(v), L.errPhone),
});
type ProfileValues = z.infer<typeof profileSchema>;


/**
 * M10 · Tài khoản & cài đặt (Chuyên viên tuyển dụng, Đại diện phòng ban): sửa họ tên / số điện thoại, đổi mật khẩu
 * (xong phải đăng nhập lại — giống web R32). HTML có sinh trắc học, thiết bị đang đăng nhập, công tắc thông báo đẩy:
 * bỏ vì hoãn (D4) hoặc backend chưa có.
 */
export function StaffSettingsScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const notify = useSnackbar();
  const me = useMe();
  const company = useCompanyName();
  const update = useUpdateProfile();
  const signOut = useSignOut();
  const [pwOpen, setPwOpen] = useState(false);

  const profile = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: "", phone: "" } });
  const { reset } = profile;
  useEffect(() => {
    if (me.data) reset({ fullName: me.data.fullName ?? "", phone: me.data.phone ?? "" });
  }, [me.data, reset]);

  const save = profile.handleSubmit((v) =>
    update.mutate(
      { fullName: v.fullName.trim(), phone: v.phone.trim() || undefined },
      { onSuccess: () => notify(L.saved), onError: (e) => notify(apiErrorMessage(e)) },
    ),
  );
  const header = (
    <ScreenHeader
      variant="compact"
      back
      title={L.title}
      actions={<PillButton label={L.save} size="sm" loading={update.isPending} disabled={!me.data} onPress={() => void save()} />}
    />
  );
  if (me.isPending) return (<>{header}<SkeletonList /></>);
  if (me.isError || !me.data) return (<>{header}<ErrorState message={apiErrorMessage(me.error)} onRetry={() => void me.refetch()} /></>);

  const pe = profile.formState.errors;
  return (
    <>
      {header}
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
        <Card>
          <View style={styles.person}>
            <Avatar name={me.data.fullName} uri={me.data.avatarUrl} size={SIZES.iconTile + SPACING.sm} />
            <View style={styles.flex}>
              <Text style={styles.name}>{me.data.fullName}</Text>
              <Text style={styles.sub}>{role ? STRINGS.roles[role] : ""}</Text>
              {company.data ? <Text style={styles.sub}>{company.data}</Text> : null}
            </View>
          </View>
        </Card>

        <Card>
          <CardTitle>{L.personal}</CardTitle>
          <FormTextField control={profile.control} name="fullName" label={L.fullName} required message={pe.fullName?.message} />
          <View style={styles.readonly}>
            <Text style={styles.label}>{L.email}</Text>
            <Text style={styles.value}>{me.data.email}</Text>
            <Text style={styles.sub}>{L.emailHint}</Text>
          </View>
          <FormTextField control={profile.control} name="phone" label={L.phone} keyboardType="phone-pad" message={pe.phone?.message} />
        </Card>

        <Card>
          <CardTitle>{L.security}</CardTitle>
          <Pressable accessibilityRole="button" onPress={() => setPwOpen(true)} style={styles.row}>
            <Icon name="lock" color={COLORS.textSecondary} />
            <View style={styles.flex}>
              <Text style={styles.value}>{L.changePassword}</Text>
              <Text style={styles.sub}>{L.changePasswordSub}</Text>
            </View>
            <Icon name="chevronRight" size={FONT_SIZE.md} color={COLORS.textMuted} />
          </Pressable>
        </Card>

        <PillButton label={L.signOut} variant="danger" icon="logout" fullWidth onPress={() => void signOut()} />
      </ScrollView>

      <ChangePasswordSheet visible={pwOpen} onDismiss={() => setPwOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.body },
  content: { padding: SPACING.page, gap: SPACING.sm2, paddingBottom: SPACING.xl },
  person: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2 },
  flex: { flex: 1 },
  name: { fontFamily: FONT.semibold, fontSize: FONT_SIZE.lg, color: COLORS.textPrimary },
  sub: { fontFamily: FONT.regular, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  label: { fontFamily: FONT.medium, fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  value: { fontFamily: FONT.medium, fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  readonly: { gap: SPACING.xxs },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm2, paddingVertical: SPACING.xs },
});
