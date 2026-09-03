import { useState } from "react";
import { App, Button, Card, Form, Input } from "antd";
import { MailOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../authApi";
import type { ApiMessageResponse, ForgotPasswordRequest } from "../types";

export default function ForgotPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const onFinish = async (values: ForgotPasswordRequest) => {
        setLoading(true);
        try {
            await forgotPassword(values);
            message.success("Nếu email tồn tại, mã OTP sẽ được gửi đến hộp thư của bạn");
            navigate("/reset-password", { state: { email: values.email } });
        } catch (error) {
            message.error((error as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không thể gửi yêu cầu");
        } finally { setLoading(false); }
    };
    return <div className="auth-center-page"><Card className="auth-center-card">
        <div className="auth-card-logo"><QuestionCircleOutlined /></div>
        <div className="auth-form-header"><h2>Quên mật khẩu</h2><p>Nhập email để nhận OTP đặt lại mật khẩu.</p></div>
        <Form layout="vertical" onFinish={onFinish}>
            <Form.Item label="Email" name="email" rules={[{ required: true }, { type: "email" }]}>
                <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>Gửi OTP</Button>
        </Form>
        <div className="auth-form-footer"><Button type="link" onClick={() => navigate("/login")}>Quay lại đăng nhập</Button></div>
    </Card></div>;
}
