import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Card, Form, Input, Space } from "antd";
import { MailOutlined, SafetyOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { resendOtp, verifyEmail } from "../authApi";
import { verifySchema, type VerifyFormValues } from "../schemas/verifySchema";
import type { ApiMessageResponse } from "../types";

export default function VerifyEmailPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const state = (useLocation().state ?? {}) as { email?: string };
    const [resending, setResending] = useState(false);
    const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema), defaultValues: { email: state.email ?? "", otpCode: "" },
    });

    const onSubmit = async (data: VerifyFormValues) => {
        try {
            await verifyEmail(data);
            message.success("Email đã được xác thực");
            navigate("/login", { state: { email: data.email }, replace: true });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Xác thực thất bại");
        }
    };

    const handleResend = async () => {
        const email = getValues("email");
        if (!email) return;
        setResending(true);
        try { await resendOtp({ email }); message.success("Nếu tài khoản đang chờ xác thực, OTP mới sẽ được gửi"); }
        catch (error) { message.error((error as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không thể gửi OTP"); }
        finally { setResending(false); }
    };

    return (
        <div className="auth-center-page"><Card className="auth-center-card">
            <div className="auth-card-logo"><SafetyOutlined /></div>
            <div className="auth-form-header"><h2>Xác thực email</h2><p>Nhập mã OTP 6 chữ số đã gửi đến email của bạn.</p></div>
            <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                <Form.Item label="Email" validateStatus={errors.email ? "error" : ""} help={errors.email?.message}>
                    <Controller name="email" control={control} render={({ field }) => <Input {...field} size="large" prefix={<MailOutlined />} />} />
                </Form.Item>
                <Form.Item label="Mã OTP" validateStatus={errors.otpCode ? "error" : ""} help={errors.otpCode?.message}>
                    <Controller name="otpCode" control={control} render={({ field }) => <Input {...field} size="large" maxLength={6} inputMode="numeric" />} />
                </Form.Item>
                <Space orientation="vertical" style={{ width: "100%" }}>
                    <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>Xác thực</Button>
                    <Button block onClick={handleResend} loading={resending}>Gửi lại OTP</Button>
                </Space>
            </Form>
        </Card></div>
    );
}
