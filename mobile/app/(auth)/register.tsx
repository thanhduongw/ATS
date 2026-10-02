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

const S = STRINGS.auth.register;
const V = STRINGS.auth.validation;

// Backend: @Size(min = 8, max = 72) cho password — giữ đúng luật để lỗi hiện tại chỗ nhập,
// không phải đợi server trả về.
const schema = z
  .object({
    fullName: z.string().trim().min(2, V.fullNameRequired),
    email: z.string().min(1, V.emailRequired).email(V.emailInvalid),
    phone: z.string().trim().optional(),
    password: z.string().min(8, V.passwordMin).max(72, V.passwordMax),
    confirmPassword: z.string().min(1, V.confirmRequired),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: V.confirmMismatch,
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/** M02 — Đăng ký ứng viên. */
export default function RegisterScreen() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      const phone = values.phone?.trim();
      await authApi.register({
        fullName: values.fullName.trim(),
        email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        ...(phone ? { phone } : {}),
      });
      router.push({ pathname: "/(auth)/verify-email", params: { email } });
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
        footer={<PromptLink prompt={S.haveAccount} label={S.login} onPress={() => router.back()} />}
      >
        <FormTextField
          control={control}
          name="fullName"
          label={S.fullName}
          required
          message={errors.fullName?.message}
          autoComplete="name"
          autoCapitalize="words"
        />
        <FormTextField
          control={control}
          name="email"
          label={S.email}
          required
          message={errors.email?.message}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="email@example.com"
        />
        <FormTextField
          control={control}
          name="phone"
          label={S.phone}
          message={errors.phone?.message}
          autoComplete="tel"
          keyboardType="phone-pad"
        />
        <FormTextField
          control={control}
          name="password"
          label={S.password}
          required
          hint={S.passwordHint}
          message={errors.password?.message}
          password
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={72}
        />
        <FormTextField
          control={control}
          name="confirmPassword"
          label={S.confirm}
          required
          message={errors.confirmPassword?.message}
          password
          autoCapitalize="none"
          autoComplete="new-password"
          maxLength={72}
          returnKeyType="go"
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
