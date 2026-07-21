import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { verifySchema, type VerifyFormValues } from "../schemas/verifySchema";
import { verifyEmail } from "../authApi";
import type { ApiMessageResponse } from "../types";

const { Title } = Typography;

// State truyền qua từ RegisterPage khi navigate sang trang này
interface LocationState {
    tenantCode?: string;
    email?: string;
}

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as LocationState;

    const {
        control,
        handleSubmit,
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

    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
            <Card style={{ width: 400 }}>
                <Title level={3} style={{ textAlign: "center" }}>
                    Xác thực email
                </Title>
                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item
                        label="Mã công ty"
                        validateStatus={errors.tenantCode ? "error" : ""}
                        help={errors.tenantCode?.message}
                    >
                        <Controller
                            name="tenantCode"
                            control={control}
                            render={({ field }) => <Input {...field} />}
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
                            render={({ field }) => <Input {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mã OTP"
                        validateStatus={errors.otpCode ? "error" : ""}
                        help={errors.otpCode?.message}
                    >
                        <Controller
                            name="otpCode"
                            control={control}
                            render={({ field }) => <Input {...field} maxLength={6} />}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block loading={isSubmitting}>
                        Xác thực
                    </Button>
                </Form>
            </Card>
        </div>
    );
}