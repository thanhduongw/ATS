import { useState } from "react";
import { Form, Input, Button, Card, App } from "antd";
import { useNavigate } from "react-router-dom";
import { BankOutlined, MailOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { forgotPassword } from "../authApi";
import type { ApiMessageResponse } from "../types";

export default function ForgotPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { tenantCode: string; email: string }) => {
        setLoading(true);
        try {
            const res = await forgotPassword(values);
            message.success(res.data.message || "Đã gửi mã OTP khôi phục mật khẩu về email!");
            navigate("/reset-password", { state: { tenantCode: values.tenantCode, email: values.email } });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không thể gửi yêu cầu quên mật khẩu");
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
                        background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <QuestionCircleOutlined style={{ fontSize: 28, color: "#D97706" }} />
                    </div>
                </div>

                <div className="auth-form-header" style={{ marginBottom: 24 }}>
                    <h2>Quên mật khẩu</h2>
                    <p>Nhập Mã công ty và Email để nhận mã OTP khôi phục mật khẩu.</p>
                </div>

                <Form layout="vertical" onFinish={onFinish}>
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
                        label="Email tài khoản"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email" },
                            { type: "email", message: "Email không đúng định dạng" },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined style={{ color: "#9CA3AF" }} />}
                            placeholder="admin@company.com"
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
                        Gửi Mã OTP Khôi Phục
                    </Button>
                </Form>

                <div className="auth-form-footer">
                    <a onClick={() => navigate("/login")}>← Quay lại Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}
