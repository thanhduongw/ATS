import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";

const RESEND_SECONDS = 60;

const schema = z
  .object({
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    // Backend: @Pattern("\d{6}") — đúng 6 chữ số, không hơn không kém.
    otpCode: z.string().trim().regex(/^\d{6}$/, "Mã OTP gồm đúng 6 chữ số"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam ?? "",
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Chặn bấm gửi lại liên tục làm backend gửi hàng loạt email — giống màn xác minh email.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const email = values.email.trim();
      await authApi.resetPassword({
        email,
        otpCode: values.otpCode.trim(),
        newPassword: values.newPassword,
      });
      // Về đăng nhập kèm email để điền sẵn, giống bản web.
      router.replace({ pathname: "/(auth)/login", params: { email, reset: "1" } });
    } catch (e) {
      setError(apiErrorMessage(e, "Đặt lại mật khẩu thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError("Vui lòng nhập email trước khi gửi lại mã.");
      return;
    }
    try {
      await authApi.forgotPassword(email);
      setSeconds(RESEND_SECONDS);
      setInfo("Nếu email tồn tại, mã OTP mới đã được gửi đi.");
    } catch (e) {
      setError(apiErrorMessage(e, "Không gửi lại được mã"));
    }
  };

  return (
    <AuthScaffold
      title="Đặt lại mật khẩu"
      subtitle="Nhập mã OTP vừa nhận và mật khẩu mới."
      footer={
        <Button mode="text" compact onPress={() => router.replace("/(auth)/login")}>
          Quay lại đăng nhập
        </Button>
      }
    >
      {/* Backend trả cùng một câu dù email có tồn tại hay không, nên không khẳng định
          "đã gửi tới email của bạn" — nói đúng những gì hệ thống bảo đảm. */}
      <Text style={styles.hint}>
        Nếu email tồn tại trong hệ thống, mã OTP gồm 6 chữ số đã được gửi tới hộp thư.
      </Text>

      <FormTextField
        control={control}
        name="email"
        label="Email"
        message={errors.email?.message}
        autoCapitalize="none"
        keyboardType="email-address"
        left={<TextInput.Icon icon="email-outline" />}
      />

      <FormTextField
        control={control}
        name="otpCode"
        label="Mã OTP"
        message={errors.otpCode?.message}
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={6}
        left={<TextInput.Icon icon="shield-key-outline" />}
      />

      <FormTextField
        control={control}
        name="newPassword"
        label="Mật khẩu mới"
        message={errors.newPassword?.message}
        autoCapitalize="none"
        secureTextEntry={!showPassword}
        maxLength={72}
        left={<TextInput.Icon icon="lock-outline" />}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword((v) => !v)}
          />
        }
      />

      <FormTextField
        control={control}
        name="confirmPassword"
        label="Nhập lại mật khẩu mới"
        message={errors.confirmPassword?.message}
        autoCapitalize="none"
        secureTextEntry={!showPassword}
        maxLength={72}
        left={<TextInput.Icon icon="lock-check-outline" />}
      />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
        contentStyle={styles.submitContent}
      >
        Cập nhật mật khẩu
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
  hint: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  submit: { marginTop: SPACING.sm },
  submitContent: { height: 44 },
  resend: { marginTop: SPACING.xs },
});
