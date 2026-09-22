import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocalSearchParams } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { AuthScaffold } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";

const schema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const setCredentials = useAuthStore((s) => s.setCredentials);
  // A3 trả về verified=1 sau khi xác minh OTP; màn đặt lại mật khẩu trả về reset=1
  // kèm email để điền sẵn, giống bản web.
  const { verified, reset, email: emailParam } = useLocalSearchParams<{
    verified?: string;
    reset?: string;
    email?: string;
  }>();
  const [notice, setNotice] = useState(
    verified === "1"
      ? "Xác minh thành công, mời đăng nhập."
      : reset === "1"
        ? "Mật khẩu đã được cập nhật, mời đăng nhập."
        : ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setError(apiErrorMessage(e, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Đăng nhập"
      subtitle="Sử dụng email và mật khẩu của bạn."
      footer={
        <>
          <Text style={styles.footerText}>Bạn là ứng viên?</Text>
          <Link href="/(auth)/register" asChild>
            <Button mode="text" compact>
              Tạo tài khoản
            </Button>
          </Link>

        </>
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

      <FormTextField
        control={control}
        name="password"
        label="Mật khẩu"
        message={errors.password?.message}
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

      <Link href="/(auth)/forgot-password" asChild>
        <Button mode="text" compact style={styles.forgot}>
          Quên mật khẩu?
        </Button>
      </Link>

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
        contentStyle={styles.submitContent}
      >
        Đăng nhập
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
      <Snackbar visible={!!notice} onDismiss={() => setNotice("")} duration={4000}>
        {notice}
      </Snackbar>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: SPACING.sm },
  // Web dùng size="large" cho nút chính → controlHeightLG = 44.
  submitContent: { height: 44 },
  footerText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  // Web đặt "Quên mật khẩu?" căn phải ngay trên nút đăng nhập.
  forgot: { alignSelf: "flex-end", marginBottom: SPACING.xs },
});
