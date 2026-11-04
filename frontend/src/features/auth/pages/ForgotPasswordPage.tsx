import { useState } from "react";
import { App, Button, Form, Input } from "antd";
import { MailOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../authApi";
import type { ApiMessageResponse, ForgotPasswordRequest } from "../types";
import AuthShell from "../components/AuthShell";

/** C07 · Quên mật khẩu: nhập email → nhận mã xác minh → sang C08. */
export default function ForgotPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: ForgotPasswordRequest) => {
        setLoading(true);
        try {
            await forgotPassword({ email: values.email.trim() });
            message.success("Nếu email có tài khoản, mã xác minh đã được gửi");
            navigate("/reset-password", { state: { email: values.email.trim() } });
        } catch (error) {
            message.error((error as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không gửi được yêu cầu");
        } finally { setLoading(false); }
    };

    return (
        <AuthShell tagline="Lấy lại quyền truy cập" title="Quên mật khẩu" subtitle="Nhập email để nhận mã xác minh."
            back={{ label: "Quay lại đăng nhập", to: "/login" }}>
            <Form layout="vertical" onFinish={onFinish}>
                <Form.Item label="Email" name="email" rules={[{ required: true, message: "Nhập email" }, { type: "email", message: "Email không hợp lệ" }]}>
                    <Input size="large" prefix={<MailOutlined />} autoComplete="email" placeholder="email@example.com" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>Gửi mã xác minh</Button>
            </Form>
        </AuthShell>
    );
}
