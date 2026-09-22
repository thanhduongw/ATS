import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Snackbar, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { SPACING } from "@/theme";

const RESEND_SECONDS = 60;

const schema = z.object({
  otpCode: z
    .string()
    .trim()
    .min(4, "Vui lòng nhập mã xác minh")
    .max(10, "Mã xác minh không hợp lệ"),
});
type FormValues = z.infer<typeof schema>;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otpCode: "" },
  });

  // Đếm ngược chặn người dùng bấm gửi lại liên tục làm backend gửi hàng loạt email.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onSubmit = async (values: FormValues) => {
    if (!email) {
      setError("Thiếu email cần xác minh, vui lòng đăng ký lại.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.verifyEmail(email, values.otpCode.trim());
      router.replace({ pathname: "/(auth)/login", params: { verified: "1" } });
    } catch (e) {
      setError(apiErrorMessage(e, "Xác minh thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email) return;
    try {
      await authApi.resendOtp(email);
      setSeconds(RESEND_SECONDS);
      setInfo("Đã gửi lại mã xác minh, vui lòng kiểm tra hộp thư.");
    } catch (e) {
      setError(apiErrorMessage(e, "Không gửi lại được mã"));
    }
  };

  return (
    <AuthScaffold
      title="Xác minh email"
      subtitle={`Mã xác minh đã được gửi tới ${email ?? "email của bạn"}.`}
      footer={
        <Button mode="text" compact onPress={() => router.replace("/(auth)/login")}>
          Quay lại đăng nhập
        </Button>
      }
    >
      <FormTextField
        control={control}
        name="otpCode"
        label="Mã xác minh (OTP)"
        message={errors.otpCode?.message}
        keyboardType="number-pad"
        autoCapitalize="none"
        left={<TextInput.Icon icon="shield-check-outline" />}
      />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
        contentStyle={styles.submitContent}
      >
        Xác minh
      </Button>

      <Button mode="text" disabled={seconds > 0} onPress={onResend} style={styles.resend}>
        {seconds > 0 ? `Gửi lại mã sau ${seconds}s` : "Gửi lại mã"}
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
      <Snackbar visible={!!info} onDismiss={() => setInfo("")} duration={3000}>
        {info}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: SPACING.sm },
  submitContent: { height: 44 },
  resend: { marginTop: SPACING.xs },
});
