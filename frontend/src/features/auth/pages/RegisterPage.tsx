import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Form, Input, Steps } from "antd";
import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { registerCandidate } from "../authApi";
import { registerSchema, type RegisterFormValues } from "../schemas/registerSchema";
import type { ApiMessageResponse } from "../types";

export default function RegisterPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "" },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            await registerCandidate({ ...data, phone: data.phone?.trim() || null });
            message.success("Tài khoản ứng viên đã được tạo. Vui lòng kiểm tra email.");
            navigate("/verify-email", { state: { email: data.email } });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Không thể đăng ký tài khoản");
        }
    };

    const fields = [
        { name: "fullName" as const, label: "Họ và tên", icon: <UserOutlined />, type: "text" },
        { name: "email" as const, label: "Email", icon: <MailOutlined />, type: "text" },
        { name: "phone" as const, label: "Số điện thoại", icon: <PhoneOutlined />, type: "text" },
        { name: "password" as const, label: "Mật khẩu", icon: <LockOutlined />, type: "password" },
        { name: "confirmPassword" as const, label: "Xác nhận mật khẩu", icon: <LockOutlined />, type: "password" },
    ];

    return (
        <div className="auth-page">
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-logo">ATS</div>
                    <h1 className="auth-hero-title">Tạo tài khoản ứng viên</h1>
                    <p className="auth-hero-subtitle">Tài khoản này chỉ có quyền ứng viên. Vai trò được backend gán cố định.</p>
                    <Steps orientation="vertical" current={0} items={[
                        { title: "Đăng ký" }, { title: "Xác thực email" }, { title: "Nộp hồ sơ" },
                    ]} />
                </div>
            </div>
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-form-header"><h2>Đăng ký ứng viên</h2><p>Nhập thông tin cá nhân để bắt đầu.</p></div>
                    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                        {fields.map((item) => (
                            <Form.Item key={item.name} label={item.label} validateStatus={errors[item.name] ? "error" : ""} help={errors[item.name]?.message}>
                                <Controller name={item.name} control={control} render={({ field }) => item.type === "password"
                                    ? <Input.Password {...field} value={field.value ?? ""} size="large" maxLength={72} prefix={item.icon} autoComplete="new-password" />
                                    : <Input {...field} value={field.value ?? ""} size="large" prefix={item.icon} />
                                } />
                            </Form.Item>
                        ))}
                        <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>Tạo tài khoản ứng viên</Button>
                    </Form>
                    <div className="auth-form-footer">Đã có tài khoản? <Button type="link" onClick={() => navigate("/login")}>Đăng nhập</Button></div>
                </div>
            </div>
        </div>
    );
}
