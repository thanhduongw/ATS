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
import AuthShell from "../components/AuthShell";

export default function LoginPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const state = (location.state ?? {}) as { email?: string; jobTitle?: string };
    // C04: quay lại trang đang xem (vd. biểu mẫu ứng tuyển) sau khi đăng nhập. Chỉ nhận đường dẫn nội bộ.
    const redirectParam = new URLSearchParams(location.search).get("redirect");
    const redirect = redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : null;
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
            navigate(redirect && claims.role === "CANDIDATE" ? redirect : defaultRouteForRole(claims.role), { replace: true });
        } catch (error) {
            const apiError = error as AxiosError<ApiMessageResponse>;
            message.error(apiError.response?.data?.message ?? "Đăng nhập thất bại");
        }
    };

    return (
        <AuthShell
            tagline="Chào mừng quay lại"
            title="Đăng nhập"
            subtitle="Dùng email và mật khẩu của bạn."
            banner={state.jobTitle ? (
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(10, 89, 247, 0.08)", fontSize: 13 }}>
                    Ứng tuyển: <b>{state.jobTitle}</b>
                </div>
            ) : undefined}
        >
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
                        Chưa có tài khoản? <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/register${location.search}`)}>Đăng ký ứng viên</Button>
                    </div>
                    <div className="auth-form-footer">
                        <Button type="link" onClick={() => navigate("/careers")}>Xem việc làm đang tuyển</Button>
                    </div>
        </AuthShell>
    );
}
