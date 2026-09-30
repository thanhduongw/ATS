import { useState } from "react";
import { Snackbar } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold, PromptLink } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";

const S = STRINGS.auth.forgot;
const V = STRINGS.auth.validation;

const schema = z.object({
  email: z.string().min(1, V.emailRequired).email(V.emailInvalid),
});
type FormValues = z.infer<typeof schema>;

/** M04 — Quên mật khẩu: gửi OTP về email. */
export default function ForgotPasswordScreen() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      await authApi.forgotPassword(email);
      // Sang màn nhập OTP kèm email để không phải gõ lại. Màn sau nói "nếu email tồn tại",
      // vì backend trả cùng một câu dù email có hay không.
      router.push({ pathname: "/(auth)/reset-password", params: { email } });
    } catch (e) {
      setError(apiErrorMessage(e, S.failed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthScaffold
        leading="back"
        title={S.title}
        subtitle={S.subtitle}
        footer={
          <PromptLink label={STRINGS.auth.backToLogin} onPress={() => router.replace("/(auth)/login")} />
        }
      >
        <FormTextField
          control={control}
          name="email"
          label={S.email}
          message={errors.email?.message}
          icon="mail"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="email@example.com"
          returnKeyType="send"
          onSubmitEditing={handleSubmit(onSubmit)}
        />
        <PillButton label={S.submit} fullWidth loading={submitting} onPress={handleSubmit(onSubmit)} />
      </AuthScaffold>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
    </>
  );
}
