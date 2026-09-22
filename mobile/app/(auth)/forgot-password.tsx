import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Snackbar, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { SPACING } from "@/theme";

const schema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      await authApi.forgotPassword(email);
      // Sang màn nhập OTP kèm email để không phải gõ lại.
      router.push({ pathname: "/(auth)/reset-password", params: { email } });
    } catch (e) {
      setError(apiErrorMessage(e, "Không gửi được yêu cầu"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Quên mật khẩu"
      subtitle="Nhập email để nhận mã OTP đặt lại mật khẩu."
      footer={
        <Button mode="text" compact onPress={() => router.replace("/(auth)/login")}>
          Quay lại đăng nhập
        </Button>
      }
    >
      <FormTextField
        control={control}
        name="email"
        label="Email"
        message={errors.email?.message}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="email@example.com"
        left={<TextInput.Icon icon="email-outline" />}
      />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
        contentStyle={styles.submitContent}
      >
        Gửi mã OTP
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: SPACING.sm },
  submitContent: { height: 44 },
});
