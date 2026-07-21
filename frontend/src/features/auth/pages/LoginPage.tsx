import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import type { AxiosError } from "axios";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";
import { login as loginApi } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "../../../app/hooks";
import type { ApiMessageResponse } from "../types";

const { Title } = Typography;

interface LocationState {
    tenantCode?: string;
    email?: string;
}

export default function LoginPage() {
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
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
            <Card style={{ width: 400 }}>
                <Title level={3} style={{ textAlign: "center" }}>
                    Đăng nhập
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
                        label="Mật khẩu"
                        validateStatus={errors.password ? "error" : ""}
                        help={errors.password?.message}
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => <Input.Password {...field} />}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block loading={isSubmitting}>
                        Đăng nhập
                    </Button>
                </Form>

                <div style={{ textAlign: "center", marginTop: 12 }}>
                    Chưa có tài khoản? <a onClick={() => navigate("/register")}>Đăng ký công ty</a>
                </div>
            </Card>
        </div>
    );
}