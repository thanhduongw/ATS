import { useState } from "react";
import { App, Button, Card, Form, Input } from "antd";
import { KeyOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../authApi";
import type { ApiMessageResponse, ResetPasswordRequest } from "../types";

export default function ResetPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const state = (useLocation().state ?? {}) as { email?: string };
    const [loading, setLoading] = useState(false);
    const onFinish = async (values: ResetPasswordRequest) => {
        setLoading(true);
        try {
            await resetPassword(values);
            message.success("Mật khẩu đã được cập nhật");
            navigate("/login", { state: { email: values.email }, replace: true });
        } catch (error) {
            message.error((error as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Đặt lại mật khẩu thất bại");
        } finally { setLoading(false); }
    };
    return <div className="auth-center-page"><Card className="auth-center-card">
        <div className="auth-card-logo"><KeyOutlined /></div>
        <div className="auth-form-header"><h2>Đặt lại mật khẩu</h2><p>Nhập OTP và mật khẩu mới.</p></div>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: state.email ?? "", otpCode: "", newPassword: "" }}>
            <Form.Item label="Email" name="email" rules={[{ required: true }, { type: "email" }]}><Input size="large" prefix={<MailOutlined />} /></Form.Item>
            <Form.Item label="Mã OTP" name="otpCode" rules={[{ required: true }, { len: 6 }]}><Input size="large" maxLength={6} inputMode="numeric" /></Form.Item>
            <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true }, { min: 8 }, { max: 72 }]}><Input.Password size="large" maxLength={72} prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>Cập nhật mật khẩu</Button>
        </Form>
    </Card></div>;
}
