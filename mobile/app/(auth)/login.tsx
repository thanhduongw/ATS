import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router, useLocalSearchParams } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { AuthScaffold, PromptLink } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { PillButton } from "@/components/ui/buttons";
import { STRINGS } from "@/lib/strings";
import { SPACING } from "@/theme";

const S = STRINGS.auth.login;
const V = STRINGS.auth.validation;

const schema = z.object({
  email: z.string().min(1, V.emailRequired).email(V.emailInvalid),
  password: z.string().min(1, V.passwordRequired),
});
type FormValues = z.infer<typeof schema>;

/** M01 — Đăng nhập (chung cho mọi role). */
export default function LoginScreen() {
  const setCredentials = useAuthStore((s) => s.setCredentials);
  // Màn xác minh trả về verified=1; màn đặt lại mật khẩu trả về reset=1 kèm email để điền sẵn.
  const { verified, reset, email: emailParam } = useLocalSearchParams<{
    verified?: string;
    reset?: string;
    email?: string;
  }>();
  const [notice, setNotice] = useState(
    verified === "1" ? S.verifiedNotice : reset === "1" ? S.resetNotice : ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailParam ?? "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const tokens = await authApi.login(values.email.trim(), values.password);
      await setCredentials(tokens.accessToken, tokens.refreshToken);
      // AuthGate ở root layout tự đẩy sang khu vực đúng role.
    } catch (e) {
      setError(apiErrorMessage(e, S.failed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthScaffold
        leading="brand"
        title={S.title}
        subtitle={S.subtitle}
        footer={
          <PromptLink
            stacked
            prompt={S.candidatePrompt}
            label={S.createAccount}
            onPress={() => router.push("/(auth)/register")}
          />
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
          returnKeyType="next"
        />

        <View>
          <FormTextField
            control={control}
            name="password"
            label={S.password}
            message={errors.password?.message}
            icon="lock"
            password
            autoCapitalize="none"
            autoComplete="current-password"
            maxLength={72}
            returnKeyType="go"
            onSubmitEditing={handleSubmit(onSubmit)}
          />
          <PillButton
            variant="text"
            size="sm"
            label={S.forgot}
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgot}
          />
        </View>

        <PillButton label={S.submit} fullWidth loading={submitting} onPress={handleSubmit(onSubmit)} />
      </AuthScaffold>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
      <Snackbar visible={!!notice} onDismiss={() => setNotice("")} duration={4000}>
        {notice}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  // Canvas đặt "Quên mật khẩu?" căn phải, ngay dưới ô mật khẩu.
  forgot: { alignSelf: "flex-end", marginTop: SPACING.xs },
});
