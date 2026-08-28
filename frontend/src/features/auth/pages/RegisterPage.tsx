import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, App, Steps } from "antd";
import { useNavigate } from "react-router-dom";
import { BankOutlined, MailOutlined, LockOutlined, UserOutlined, SafetyOutlined, CheckCircleOutlined, RocketOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { registerSchema, type RegisterFormValues } from "../schemas/registerSchema";
import { registerCompany } from "../authApi";
import type { ApiMessageResponse } from "../types";

export default function RegisterPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            tenantCode: "",
            companyName: "",
            adminEmail: "",
            adminPassword: "",
            adminFullName: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            await registerCompany(data);
            message.success("Đăng ký thành công, vui lòng kiểm tra email để lấy mã OTP");
            navigate("/verify-email", {
                state: { tenantCode: data.tenantCode, email: data.adminEmail },
            });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Đăng ký thất bại");
        }
    };

    return (
        <div className="auth-page">
            {/* ── Hero Side ─────────────────────── */}
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-logo">ATS</div>
                    <h1 className="auth-hero-title">
                        Bắt đầu quản lý tuyển dụng chuyên nghiệp
                    </h1>
                    <p className="auth-hero-subtitle">
                        Đăng ký công ty chỉ trong vài bước đơn giản. Hệ thống sẽ tự động
                        thiết lập không gian làm việc riêng cho doanh nghiệp của bạn.
                    </p>

                    {/* Steps preview */}
                    <Steps
                        orientation="vertical"
                        size="small"
                        current={0}
                        items={[
                            { title: <span style={{ color: "#fff" }}>Đăng ký thông tin</span>, icon: <RocketOutlined style={{ color: "#D9F99D" }} /> },
                            { title: <span style={{ color: "rgba(255,255,255,0.6)" }}>Xác thực Email (OTP)</span>, icon: <SafetyOutlined style={{ color: "rgba(255,255,255,0.4)" }} /> },
                            { title: <span style={{ color: "rgba(255,255,255,0.6)" }}>Đăng nhập & Bắt đầu</span>, icon: <CheckCircleOutlined style={{ color: "rgba(255,255,255,0.4)" }} /> },
                        ]}
                        style={{ maxWidth: 300 }}
                    />
                </div>
            </div>

            {/* ── Form Side ─────────────────────── */}
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h2>Đăng ký công ty</h2>
                        <p>Tạo tài khoản doanh nghiệp và quản trị viên đầu tiên.</p>
                    </div>

                    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                        <Form.Item
                            label="Mã công ty (Tenant Code)"
                            validateStatus={errors.tenantCode ? "error" : ""}
                            help={errors.tenantCode?.message}
                        >
                            <Controller
                                name="tenantCode"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        prefix={<BankOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="vd: iuhtech"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Tên công ty"
                            validateStatus={errors.companyName ? "error" : ""}
                            help={errors.companyName?.message}
                        >
                            <Controller
                                name="companyName"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        prefix={<BankOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="Tên đầy đủ công ty"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Email quản trị"
                            validateStatus={errors.adminEmail ? "error" : ""}
                            help={errors.adminEmail?.message}
                        >
                            <Controller
                                name="adminEmail"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        prefix={<MailOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="admin@company.com"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu"
                            validateStatus={errors.adminPassword ? "error" : ""}
                            help={errors.adminPassword?.message}
                        >
                            <Controller
                                name="adminPassword"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="Tối thiểu 8 ký tự"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Họ tên quản trị viên"
                            validateStatus={errors.adminFullName ? "error" : ""}
                            help={errors.adminFullName?.message}
                        >
                            <Controller
                                name="adminFullName"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        prefix={<UserOutlined style={{ color: "#9CA3AF" }} />}
                                        placeholder="Nguyễn Văn A"
                                        size="large"
                                        {...field}
                                    />
                                )}
                            />
                        </Form.Item>

                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                            loading={isSubmitting}
                            style={{ height: 48, fontWeight: 600, fontSize: 15 }}
                        >
                            Đăng ký
                        </Button>
                    </Form>

                    <div className="auth-form-footer">
                        Đã có tài khoản?{" "}
                        <a onClick={() => navigate("/login")}>Đăng nhập</a>
                    </div>
                </div>
            </div>
        </div>
    );
}