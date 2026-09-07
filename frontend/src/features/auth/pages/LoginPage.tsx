import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Divider, Form, Input } from "antd";
import { GoogleOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../app/hooks";
import { defaultRouteForRole } from "../../../app/roleNavigation";
import { login as loginApi } from "../authApi";
import { setCredentials } from "../authSlice";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";
import type { ApiMessageResponse, JwtPayload } from "../types";
import { OAUTH2_PRE_LOGIN_URL } from "../../../config";

export default function LoginPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const state = (location.state ?? {}) as { email?: string };
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: state.email ?? "", password: "" },
    });

    useEffect(() => {
        const ssoError = new URLSearchParams(location.search).get("ssoError");
        if (ssoError) {
            message.error(ssoError);
            navigate("/login", { replace: true });
        }
    }, [location.search, message, navigate]);

    const onSubmit = async (data: LoginFormValues) => {
        try {
            const response = await loginApi(data);
            const claims = jwtDecode<JwtPayload>(response.data.accessToken);
            dispatch(setCredentials(response.data));
            message.success("Đăng nhập thành công");
            navigate(defaultRouteForRole(claims.role), { replace: true });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Đăng nhập thất bại");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-logo">ATS</div>
                    <h1 className="auth-hero-title">Hệ thống tuyển dụng của doanh nghiệp</h1>
                    <p className="auth-hero-subtitle">
                        Nhân viên nội bộ sử dụng tài khoản do quản trị viên cấp. Ứng viên có thể đăng ký
                        để nộp hồ sơ và theo dõi tiến độ tuyển dụng.
                    </p>
                </div>
            </div>
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h2>Đăng nhập</h2>
                        <p>Sử dụng email và mật khẩu của bạn.</p>
                    </div>
                    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                        <Form.Item label="Email" validateStatus={errors.email ? "error" : ""} help={errors.email?.message}>
                            <Controller name="email" control={control} render={({ field }) => (
                                <Input {...field} size="large" autoComplete="email" prefix={<MailOutlined />} placeholder="email@example.com" />
                            )} />
                        </Form.Item>
                        <Form.Item label="Mật khẩu" validateStatus={errors.password ? "error" : ""} help={errors.password?.message}>
                            <Controller name="password" control={control} render={({ field }) => (
                                <Input.Password {...field} size="large" maxLength={72} autoComplete="current-password" prefix={<LockOutlined />} />
                            )} />
                        </Form.Item>
                        <div style={{ textAlign: "right", marginBottom: 16 }}>
                            <Button type="link" onClick={() => navigate("/forgot-password")}>Quên mật khẩu?</Button>
                        </div>
                        <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>Đăng nhập</Button>
                    </Form>
                    <Divider plain>hoặc</Divider>
                    <Button icon={<GoogleOutlined />} block size="large" onClick={() => {
                        window.location.href = OAUTH2_PRE_LOGIN_URL;
                    }}>Đăng nhập bằng Google</Button>
                    <div className="auth-form-footer">
                        Bạn là ứng viên? <Button type="link" onClick={() => navigate("/register")}>Tạo tài khoản</Button>
                    </div>
                    <div className="auth-form-footer">
                        <Button type="link" onClick={() => navigate("/careers")}>Xem việc làm đang tuyển</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
