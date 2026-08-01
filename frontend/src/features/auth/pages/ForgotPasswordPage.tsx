import { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { forgotPassword } from "../authApi";
import type { ApiMessageResponse } from "../types";

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { tenantCode: string; email: string }) => {
        setLoading(true);
        try {
            const res = await forgotPassword(values);
            message.success(res.data.message || "Đã gửi mã OTP khôi phục mật khẩu về email của bạn!");
            navigate("/reset-password", { state: { tenantCode: values.tenantCode, email: values.email } });
        } catch (err) {
            const axiosErr = err as AxiosError<ApiMessageResponse>;
            message.error(axiosErr.response?.data?.message ?? "Không thể gửi yêu cầu quên mật khẩu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
            <Card style={{ width: 420, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <Title level={3} style={{ textAlign: "center", marginBottom: 8 }}>
                    Quên mật khẩu
                </Title>
                <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
                    Nhập Mã công ty và Email của bạn để nhận mã OTP 6 số khôi phục mật khẩu.
                </Text>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Mã công ty"
                        name="tenantCode"
                        rules={[{ required: true, message: "Vui lòng nhập mã công ty" }]}
                    >
                        <Input placeholder="vd: iuhtech" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="Email tài khoản"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email" },
                            { type: "email", message: "Email không đúng định dạng" },
                        ]}
                    >
                        <Input placeholder="admin@iuhtech.com" size="large" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ marginTop: 12 }}>
                        Gửi Mã OTP Khôi Phục
                    </Button>
                </Form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                    Quay lại <a onClick={() => navigate("/login")}>Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}
