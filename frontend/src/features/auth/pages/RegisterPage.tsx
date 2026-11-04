import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Checkbox, Form, Input } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { registerCandidate } from "../authApi";
import { registerSchema, type RegisterFormValues } from "../schemas/registerSchema";
import type { ApiMessageResponse } from "../types";
import AuthShell from "../components/AuthShell";
import { COLORS } from "../../../app/theme";

/**
 * C05 · Đăng ký ứng viên: 1 ô mật khẩu kèm thanh độ mạnh (backend vẫn cần confirmPassword → gửi trùng mật khẩu),
 * ô đồng ý chính sách dữ liệu. Số điện thoại hỏi sau, ở biểu mẫu ứng tuyển (C09).
 * Giữ ?redirect= qua bước xác minh email để quay lại đúng việc làm đang xem.
 */
function strength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (!pw) return { score: 0, label: "", color: COLORS.border };
    if (pw.length < 8) return { score: 1, label: "Quá ngắn", color: COLORS.error };
    if (score <= 2) return { score: 2, label: "Mật khẩu yếu", color: COLORS.warning };
    if (score <= 3) return { score: 3, label: "Mật khẩu khá mạnh", color: COLORS.primary };
    return { score: 4, label: "Mật khẩu mạnh", color: COLORS.success };
}

export default function RegisterPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: "", email: "", password: "", consent: false },
    });
    const pw = strength(watch("password") ?? "");

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            await registerCandidate({ fullName: data.fullName.trim(), email: data.email.trim(), password: data.password, confirmPassword: data.password, phone: null });
            message.success("Đã tạo tài khoản. Hãy nhập mã xác minh gửi tới email của bạn.");
            navigate(`/verify-email${location.search}`, { state: { email: data.email.trim() } });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể đăng ký tài khoản");
        }
    };

    return (
        <AuthShell tagline="Một hồ sơ, mọi cơ hội" title="Tạo tài khoản">
            <Form layout="vertical" onFinish={handleSubmit(onSubmit)} requiredMark>
                <Form.Item label="Họ và tên" required validateStatus={errors.fullName ? "error" : ""} help={errors.fullName?.message}>
                    <Controller name="fullName" control={control} render={({ field }) => (
                        <Input {...field} size="large" prefix={<UserOutlined />} autoComplete="name" />
                    )} />
                </Form.Item>
                <Form.Item label="Email" required validateStatus={errors.email ? "error" : ""} help={errors.email?.message}>
                    <Controller name="email" control={control} render={({ field }) => (
                        <Input {...field} size="large" prefix={<MailOutlined />} autoComplete="email" placeholder="email@example.com" />
                    )} />
                </Form.Item>
                <Form.Item label="Mật khẩu" required validateStatus={errors.password ? "error" : ""} help={errors.password?.message}
                    extra={pw.label ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            <div style={{ display: "flex", gap: 4, flex: 1 }}>
                                {[1, 2, 3, 4].map((i) => (
                                    <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pw.score ? pw.color : COLORS.fill }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 12, color: pw.color, whiteSpace: "nowrap" }}>{pw.label}</span>
                        </div>
                    ) : undefined}>
                    <Controller name="password" control={control} render={({ field }) => (
                        <Input.Password {...field} size="large" maxLength={72} prefix={<LockOutlined />} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
                    )} />
                </Form.Item>
                <Form.Item validateStatus={errors.consent ? "error" : ""} help={errors.consent?.message}>
                    <Controller name="consent" control={control} render={({ field }) => (
                        <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                            Tôi đồng ý với Chính sách bảo mật dữ liệu
                        </Checkbox>
                    )} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>Tạo tài khoản</Button>
            </Form>
            <div style={{ textAlign: "center", fontSize: 14, color: COLORS.textSecondary }}>
                Đã có tài khoản? <a onClick={() => navigate(`/login${location.search}`)}>Đăng nhập</a>
            </div>
        </AuthShell>
    );
}
