import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, App, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { MailOutlined, SafetyOutlined, BankOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { verifySchema, type VerifyFormValues } from "../schemas/verifySchema";
import { verifyEmail, resendOtp } from "../authApi";
import type { ApiMessageResponse } from "../types";

interface LocationState {
    tenantCode?: string;
    email?: string;
}

export default function VerifyEmailPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as LocationState;
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const {
        control,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            tenantCode: state.tenantCode ?? "",
            email: state.email ?? "",
            otpCode: "",
        },
    });

    /* Countdown timer for resend — dùng setTimeout tránh nhiều interval */
    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const onSubmit = async (data: VerifyFormValues) => {
        try {
            await verifyEmail(data);
            message.success("Xác thực thành công! Vui lòng đăng nhập.");
            navigate("/login", {
                state: { tenantCode: data.tenantCode, email: data.email },
            });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Xác thực thất bại");
        }
    };

    const handleResendOtp = async () => {
        const tenantCode = getValues("tenantCode");
        const email = getValues("email");
        if (!tenantCode || !email) {
            message.error("Vui lòng nhập Mã công ty và Email để gửi lại OTP");
            return;
        }
        setResending(true);
        try {
            const res = await resendOtp({ tenantCode, email });
            message.success(res.data.message || "Đã gửi lại mã OTP về Email!");
            setCountdown(60);
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Gửi lại OTP thất bại");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-center-page">
            <Card className="auth-center-card" style={{ padding: "32px 28px" }}>
                {/* Logo */}
                <div className="auth-card-logo">ATS</div>

                {/* Icon */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <SafetyOutlined style={{ fontSize: 28, color: "#0E7A5F" }} />
                    </div>
                </div>

                <div className="auth-form-header" style={{ marginBottom: 24 }}>
                    <h2>Xác thực Email</h2>
                    <p>
                        Nhập mã OTP 6 số được gửi về
                        {state.email ? <strong> {state.email}</strong> : " Email của bạn"}
                        {" "}để hoàn tất đăng ký.
                    </p>
                </div>

                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Mã công ty"
                        validateStatus={errors.tenantCode ? "error" : ""}
                        help={errors.tenantCode?.message}
                    >
                        <Controller
                            name="tenantCode"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    prefix={<BankOutlined style={{ color: "#9CA3AF" }} />}
                                    size="large"
                                    {...field}
                                />
                            )}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        validateStatus={errors.email ? "error" : ""}
                        help={errors.email?.message}
                    >
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    prefix={<MailOutlined style={{ color: "#9CA3AF" }} />}
                                    size="large"
                                    {...field}
                                />
                            )}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mã OTP 6 số"
                        validateStatus={errors.otpCode ? "error" : ""}
                        help={errors.otpCode?.message}
                    >
                        <Controller
                            name="otpCode"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    placeholder="• • • • • •"
                                    size="large"
                                    maxLength={6}
                                    style={{
                                        letterSpacing: 12,
                                        fontWeight: 700,
                                        fontSize: 22,
                                        textAlign: "center",
                                        height: 56,
                                    }}
                                    {...field}
                                />
                            )}
                        />
                    </Form.Item>

                    <Space style={{ width: "100%" }} direction="vertical" size="middle">
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={isSubmitting}
                            style={{ height: 48, fontWeight: 600, fontSize: 15 }}
                        >
                            Xác thực ngay
                        </Button>

                        <Button
                            block
                            onClick={handleResendOtp}
                            loading={resending}
                            disabled={countdown > 0}
                            style={{ height: 44 }}
                        >
                            {countdown > 0
                                ? `Gửi lại mã OTP (${countdown}s)`
                                : "Gửi lại mã OTP qua Email"}
                        </Button>
                    </Space>
                </Form>

                <div className="auth-form-footer">
                    <a onClick={() => navigate("/login")}>← Quay lại Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}