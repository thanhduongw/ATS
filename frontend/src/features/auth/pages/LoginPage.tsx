import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, Typography, App, Flex } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import type { AxiosError } from "axios";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";
import { login as loginApi } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "../../../app/hooks";
import type { ApiMessageResponse } from "../types";

const { Title, Text } = Typography;

interface LocationState {
    tenantCode?: string;
    email?: string;
}

export default function LoginPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as LocationState;
    const dispatch = useAppDispatch();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            tenantCode: state.tenantCode ?? "",
            email: state.email ?? "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        try {
            const res = await loginApi(data);
            dispatch(setCredentials(res.data));
            message.success("Đăng nhập thành công");
            navigate("/dashboard");
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Đăng nhập thất bại");
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
            <Card style={{ width: 420, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <Title level={3} style={{ textAlign: "center", marginBottom: 8 }}>
                    Đăng nhập Hệ thống ATS
                </Title>
                <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
                    Quản lý Tuyển dụng Chuẩn Doanh Nghiệp (Multi-tenancy)
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
                            render={({ field }) => <Input placeholder="Mã công ty" size="large" {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Email tài khoản"
                        validateStatus={errors.email ? "error" : ""}
                        help={errors.email?.message}
                    >
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => <Input placeholder="email@company.com" size="large" {...field} />}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        validateStatus={errors.password ? "error" : ""}
                        help={errors.password?.message}
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => <Input.Password placeholder="••••••••" size="large" {...field} />}
                        />
                    </Form.Item>

                    <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                        <a onClick={() => navigate("/forgot-password")} style={{ fontSize: 14 }}>
                            Quên mật khẩu?
                        </a>
                    </Flex>

                    <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
                        Đăng nhập
                    </Button>
                </Form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                    Chưa có tài khoản? <a onClick={() => navigate("/register")}>Đăng ký công ty ngay</a>
                </div>
            </Card>
        </div>
    );
}