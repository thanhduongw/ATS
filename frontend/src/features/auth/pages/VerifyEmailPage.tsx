import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, Typography, App, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { verifySchema, type VerifyFormValues } from "../schemas/verifySchema";
import { verifyEmail, resendOtp } from "../authApi";
import type { ApiMessageResponse } from "../types";

const { Title, Text } = Typography;

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

    const onSubmit = async (data: VerifyFormValues) => {
        try {
            await verifyEmail(data);
            message.success("Xác thực thành công, vui lòng đăng nhập");
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
            message.success(res.data.message || "Đã gửi lại mã OTP về Email của bạn!");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Gửi lại OTP thất bại");
        } finally {
            setResending(false);
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
            <Card style={{ width: 420, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <Title level={3} style={{ textAlign: "center", marginBottom: 8 }}>
                    Xác thực email
                </Title>
                <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
                    Nhập mã OTP 6 số được gửi về Email để hoàn tất đăng ký.
                </Text>

                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Mã công ty"
                        validateStatus={errors.tenantCode ? "error" : ""}
                        help={errors.tenantCode?.message}
                    >
                        <Controller
                            name="tenantCode"
                            control={control}
                            render={({ field }) => <Input size="large" {...field} />}
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
                            render={({ field }) => <Input size="large" {...field} />}
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
                                <Input placeholder="123456" size="large" maxLength={6} style={{ letterSpacing: 4, fontWeight: "bold", textAlign: "center" }} {...field} />
                            )}
                        />
                    </Form.Item>

                    <Space style={{ width: "100%" }} direction="vertical">
                        <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
                            Xác thực ngay
                        </Button>

                        <Button block onClick={handleResendOtp} loading={resending}>
                            Gửi lại mã OTP qua Email
                        </Button>
                    </Space>
                </Form>
            </Card>
        </div>
    );
}