import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthScaffold } from "@/components/auth-scaffold";
import { FormTextField } from "@/components/form-text-field";
import { COLORS, FONT, FONT_SIZE, SPACING } from "@/theme";

// Backend: @Size(min = 8, max = 72) cho password — giữ đúng luật để lỗi hiện tại chỗ nhập,
// không phải đợi server trả về.
const schema = z
  .object({
    fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
    email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
    phone: z.string().trim().optional(),
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
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
      setError(apiErrorMessage(e, "Đăng ký thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Đăng ký ứng viên"
      subtitle="Tạo tài khoản để nộp hồ sơ và theo dõi tiến độ tuyển dụng."
      footer={
        <>
          <Text style={styles.footerText}>Đã có tài khoản?</Text>
          <Button mode="text" compact onPress={() => router.back()}>
            Đăng nhập
          </Button>
        </>
      }
    >
      <FormTextField
        control={control}
        name="fullName"
        label="Họ và tên"
        message={errors.fullName?.message}
        left={<TextInput.Icon icon="account-outline" />}
      />

      <FormTextField
        control={control}
        name="email"
        label="Email"
        message={errors.email?.message}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="email@example.com"
        left={<TextInput.Icon icon="email-outline" />}
      />

      <FormTextField
        control={control}
        name="phone"
        label="Số điện thoại (không bắt buộc)"
        message={errors.phone?.message}
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone-outline" />}
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

      <FormTextField
        control={control}
        name="confirmPassword"
        label="Nhập lại mật khẩu"
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
        Đăng ký
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
  footerText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
});
