import { useState } from "react";
import { Snackbar } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router, useLocalSearchParams } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold, PromptLink, ResendRow } from "@/components/auth-scaffold";
import { FormOtpField } from "@/components/form-otp-field";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { useCountdown } from "@/lib/use-countdown";

const S = STRINGS.auth.verify;
const RESEND_SECONDS = 60;

// Backend: @Pattern("\d{6}") — đúng 6 chữ số.
const schema = z.object({
  otpCode: z.string().regex(/^\d{6}$/, STRINGS.auth.validation.otpFormat),
});
type FormValues = z.infer<typeof schema>;

/** M03 — Xác minh email bằng OTP sau khi đăng ký. */
export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { otpCode: "" } });

  const onSubmit = async (values: FormValues) => {
    if (!email) {
      setError(S.missingEmail);
      return;
    }
    setSubmitting(true);
    try {
      await authApi.verifyEmail(email, values.otpCode);
      router.replace({ pathname: "/(auth)/login", params: { verified: "1", email } });
    } catch (e) {
      setError(apiErrorMessage(e, S.failed));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      setError(S.missingEmail);
      return;
    }
    try {
      await authApi.resendOtp(email);
      restart();
      setInfo(S.resent);
    } catch (e) {
      setError(apiErrorMessage(e, S.resendFailed));
    }
  };

  return (
    <>
      <AuthScaffold
        leading={{ icon: "mail" }}
        title={S.title}
        subtitle={S.subtitle(email)}
        footer={
          <PromptLink label={STRINGS.auth.backToLogin} onPress={() => router.replace("/(auth)/login")} />
        }
      >
        <FormOtpField control={control} name="otpCode" message={errors.otpCode?.message} autoFocus />
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
