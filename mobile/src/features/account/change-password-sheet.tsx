import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiErrorMessage } from "@/api/client";
import { FormTextField } from "@/components/form-text-field";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PillButton } from "@/components/ui/buttons";
import { useSnackbar } from "@/components/ui/snackbar";
import { STRINGS } from "@/lib/strings";
import { useSignOut } from "@/lib/use-sign-out";
import { useChangePassword } from "./hooks";

const L = STRINGS.staff.settings;

const passwordSchema = z
  .object({
    current: z.string().min(1, L.errCurrent),
    next: z.string().min(8, L.errNew).max(72),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: L.errMatch });
type PasswordValues = z.infer<typeof passwordSchema>;

/**
 * Sheet đổi mật khẩu — dùng chung cho khu nhân viên (M10) và ứng viên (Cá nhân, thêm 26/11/2026).
 * Đổi xong backend thu hồi phiên nên đăng xuất luôn, giống web.
 */
export function ChangePasswordSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const notify = useSnackbar();
  const change = useChangePassword();
  const signOut = useSignOut();
  const pw = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { current: "", next: "", confirm: "" } });
  const { reset } = pw;
  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const submit = pw.handleSubmit((v) =>
    change.mutate(
      { currentPassword: v.current, newPassword: v.next },
      {
        onSuccess: () => {
          onDismiss();
          notify(L.changed);
          void signOut();
        },
        // Lỗi hiện ngay trong sheet: snackbar nằm dưới lớp phủ của sheet nên người dùng không thấy.
        onError: (e) => {
          const msg = apiErrorMessage(e);
          pw.setError("current", { message: /current password|mật khẩu hiện tại/i.test(msg) ? L.errWrongCurrent : msg });
        },
      },
    ),
  );

  const we = pw.formState.errors;
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={L.changePassword}
      subtitle={L.changePasswordSub}
      footer={<PillButton label={L.change} loading={change.isPending} fullWidth onPress={() => void submit()} />}
    >
      <FormTextField control={pw.control} name="current" label={L.current} password message={we.current?.message} />
      <FormTextField control={pw.control} name="next" label={L.next} password message={we.next?.message} />
      <FormTextField control={pw.control} name="confirm" label={L.confirm} password message={we.confirm?.message} />
    </BottomSheet>
  );
}
