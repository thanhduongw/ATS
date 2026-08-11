import { useState } from "react";
import { Form, Input, Button, Card, App } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { BankOutlined, MailOutlined, LockOutlined, KeyOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { resetPassword } from "../authApi";
import type { ApiMessageResponse, ResetPasswordRequest } from "../types";

interface LocationState {
    tenantCode?: string;
    email?: string;
}

export default function ResetPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as LocationState;
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: ResetPasswordRequest) => {
        setLoading(true);
        try {
            const res = await resetPassword(values);
            message.success(res.data.message || "Đặt lại mật khẩu thành công!");
            navigate("/login", { state: { tenantCode: values.tenantCode, email: values.email } });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Đặt lại mật khẩu thất bại");
        } finally {
            setLoading(false);
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
                        background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <KeyOutlined style={{ fontSize: 28, color: "#7C3AED" }} />
                    </div>
                </div>

                <div className="auth-form-header" style={{ marginBottom: 24 }}>
                    <h2>Đặt lại mật khẩu</h2>
                    <p>Nhập mã OTP 6 số từ Email và tạo mật khẩu mới.</p>
                </div>

                <Form
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        tenantCode: state.tenantCode ?? "",
                        email: state.email ?? "",
                        otpCode: "",
                        newPassword: "",
                    }}
                >
                    <Form.Item
                        label="Mã công ty"
                        name="tenantCode"
                        rules={[{ required: true, message: "Vui lòng nhập mã công ty" }]}
                    >
                        <Input
                            prefix={<BankOutlined style={{ color: "#9CA3AF" }} />}
                            placeholder="vd: iuhtech"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email" },
                            { type: "email", message: "Email không hợp lệ" },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: "#9CA3AF" }} />}
                            placeholder="admin@company.com"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mã OTP 6 số"
                        name="otpCode"
                        rules={[
                            { required: true, message: "Vui lòng nhập mã OTP" },
                            { len: 6, message: "Mã OTP gồm 6 chữ số" },
                        ]}
                    >
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
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu mới" },
                            { min: 8, message: "Mật khẩu mới phải từ 8 ký tự" },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: "#9CA3AF" }} />}
                            placeholder="Tối thiểu 8 ký tự"
                            size="large"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        loading={loading}
                        style={{ height: 48, fontWeight: 600, fontSize: 15, marginTop: 8 }}
                    >
                        Xác Nhận Đặt Lại Mật Khẩu
                    </Button>
                </Form>

                <div className="auth-form-footer">
                    <a onClick={() => navigate("/login")}>← Quay lại Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}
