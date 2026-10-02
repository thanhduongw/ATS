import { useState } from "react";
import { Snackbar } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router, useLocalSearchParams } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold, ResendRow } from "@/components/auth-scaffold";
import { FormOtpField } from "@/components/form-otp-field";
import { FormTextField } from "@/components/form-text-field";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { useCountdown } from "@/lib/use-countdown";

const S = STRINGS.auth.reset;
const V = STRINGS.auth.validation;
const RESEND_SECONDS = 60;

const schema = z
  .object({
    email: z.string().min(1, V.emailRequired).email(V.emailInvalid),
    // Backend: @Pattern("\d{6}") — đúng 6 chữ số, không hơn không kém.
    otpCode: z.string().regex(/^\d{6}$/, V.otpFormat),
    newPassword: z.string().min(8, V.passwordMin).max(72, V.passwordMax),
    confirmPassword: z.string().min(1, V.confirmRequired),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: V.confirmMismatch,
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/**
 * M05 — Đặt lại mật khẩu bằng OTP.
 * Đi từ màn quên mật khẩu thì email có sẵn trong tham số → ẩn ô email như canvas. Mở thẳng
 * màn này (không có tham số) thì hiện ô email để người dùng tự nhập.
 */
export default function ResetPasswordScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailParam ?? "", otpCode: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      await authApi.resetPassword({ email, otpCode: values.otpCode, newPassword: values.newPassword });
      // Về đăng nhập kèm email để điền sẵn.
      router.replace({ pathname: "/(auth)/login", params: { email, reset: "1" } });
    } catch (e) {
      setError(apiErrorMessage(e, S.failed));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError(S.needEmail);
      return;
    }
    try {
      await authApi.forgotPassword(email);
      restart();
      setInfo(S.resent);
    } catch (e) {
      setError(apiErrorMessage(e, S.resendFailed));
    }
  };

  return (
    <>
      <AuthScaffold leading="back" title={S.title} subtitle={S.subtitle(emailParam)}>
        {!emailParam ? (
          <FormTextField
            control={control}
            name="email"
            label={S.email}
            message={errors.email?.message}
            icon="mail"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        ) : null}

        <FormOtpField
          control={control}
          name="otpCode"
          label={STRINGS.auth.otpLabel}
          message={errors.otpCode?.message}
          autoFocus={!!emailParam}
        />

        <FormTextField
          control={control}
          name="newPassword"
          label={S.newPassword}
          message={errors.newPassword?.message}
          icon="lock"
          password
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={72}
        />
        <FormTextField
          control={control}
          name="confirmPassword"
          label={S.confirm}
          message={errors.confirmPassword?.message}
          icon="lock"
          password
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={72}
          returnKeyType="go"
          onSubmitEditing={handleSubmit(onSubmit)}
        />

        <PillButton label={S.submit} fullWidth loading={submitting} onPress={handleSubmit(onSubmit)} />
        <ResendRow prompt={S.notReceived} secondsLeft={seconds} onResend={onResend} />
      </AuthScaffold>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
      <Snackbar visible={!!info} onDismiss={() => setInfo("")} duration={3000}>
        {info}
      </Snackbar>
    </>
  );
}
