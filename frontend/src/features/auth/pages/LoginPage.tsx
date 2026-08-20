import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, App, Divider } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { MailOutlined, LockOutlined, BankOutlined, TeamOutlined, CalendarOutlined, FileTextOutlined, CheckCircleOutlined, GoogleOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";
import { login as loginApi } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "../../../app/hooks";
import type { ApiMessageResponse } from "../types";

const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:8081";

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
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            tenantCode: state.tenantCode ?? "",
            email: state.email ?? "",
            password: "",
        },
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const ssoError = params.get("ssoError");
        if (ssoError) {
            message.error(ssoError);
            navigate("/login", { replace: true });
        }
    }, [location.search, message, navigate]);

    const handleGoogleLogin = () => {
        const tenantCode = getValues("tenantCode")?.trim();
        if (!tenantCode) {
            message.warning("Vui lòng nhập mã công ty trước khi đăng nhập bằng Google");
            return;
        }
        window.location.href = `${AUTH_SERVICE_URL}/oauth2/pre-login?tenantCode=${encodeURIComponent(tenantCode)}`;
    };

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

    const features = [
        { icon: <TeamOutlined />, text: "Quản lý ứng viên & Talent Pool" },
        { icon: <CalendarOutlined />, text: "Lên lịch phỏng vấn 3 bên tự động" },
        { icon: <FileTextOutlined />, text: "Tạo & duyệt Offer trực tuyến" },
        { icon: <CheckCircleOutlined />, text: "Quy trình Kanban kéo-thả trực quan" },
    ];

    return (
        <div className="auth-page">
            {/* ── Hero Side ─────────────────────── */}
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-logo">ATS</div>
                    <h1 className="auth-hero-title">
                        Hệ thống Quản lý Tuyển dụng Chuẩn Doanh Nghiệp
                    </h1>
                    <p className="auth-hero-subtitle">
                        Giải pháp toàn diện giúp doanh nghiệp quản lý quy trình tuyển dụng
                        từ đăng tin, sàng lọc CV, phỏng vấn đến Offer — tất cả trong một nền tảng.
                    </p>
                    <div className="auth-hero-features">
                        {features.map((f, i) => (
                            <div key={i} className="auth-hero-feature">
                                <div className="auth-hero-feature-icon">{f.icon}</div>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Form Side ─────────────────────── */}
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h2>Đăng nhập</h2>
                        <p>Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.</p>
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
                                        placeholder="Nhập mã công ty"
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
                                        placeholder="email@company.com"
                                        size="large"
                                        {...field}
                                    />
                                )}
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
                                render={({ field }) => (
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="••••••••"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <div style={{ textAlign: "right", marginBottom: 16 }}>
                            <a
                                onClick={() => navigate("/forgot-password")}
                                style={{ fontSize: 13, color: "#0E7A5F", fontWeight: 500 }}
                            >
                                Quên mật khẩu?
                            </a>
                        </div>

                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={isSubmitting}
                            style={{ height: 48, fontWeight: 600, fontSize: 15 }}
                        >
                            Đăng nhập
                        </Button>
                    </Form>

                    <Divider plain style={{ fontSize: 12, color: "#9CA3AF" }}>hoặc</Divider>

                    <Button
                        icon={<GoogleOutlined />}
                        block
                        size="large"
                        onClick={handleGoogleLogin}
                        style={{ height: 48, fontWeight: 500 }}
                    >
                        Đăng nhập bằng Google
                    </Button>

                    <div className="auth-form-footer">
                        Chưa có tài khoản?{" "}
                        <a onClick={() => navigate("/register")}>Đăng ký công ty ngay</a>
                    </div>
                </div>
            </div>
        </div>
    );
}