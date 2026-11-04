import { useState } from "react";
import { App, Button, Form, Input } from "antd";
import { LockOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../authApi";
import type { ApiMessageResponse } from "../types";
import AuthShell from "../components/AuthShell";

/** C08 · Đặt lại mật khẩu: 6 ô mã, mật khẩu mới, nhập lại (báo "không khớp" ngay khi gõ). */
type ResetForm = { otpCode: string; newPassword: string; confirm: string };

export default function ResetPasswordPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const email = ((useLocation().state ?? {}) as { email?: string }).email ?? "";
    const [loading, setLoading] = useState(false);

    if (!email) return <Navigate to="/forgot-password" replace />;

    const onFinish = async (v: ResetForm) => {
        setLoading(true);
        try {
            await resetPassword({ email, otpCode: v.otpCode, newPassword: v.newPassword });
            message.success("Đã đặt lại mật khẩu. Mời bạn đăng nhập.");
            navigate("/login", { state: { email }, replace: true });
        } catch (error) {
            message.error((error as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Đặt lại mật khẩu thất bại");
        } finally { setLoading(false); }
    };

    return (
        <AuthShell tagline="Mật khẩu mới, bắt đầu lại" title="Đặt lại mật khẩu" subtitle={<>Mã đã gửi tới <b>{email}</b></>}
            back={{ label: "Quay lại", to: "/forgot-password" }}>
            <Form<ResetForm> layout="vertical" onFinish={onFinish} requiredMark={false}>
                <Form.Item label="Mã xác minh" name="otpCode"
                    rules={[{ required: true, message: "Nhập mã xác minh" }, { pattern: /^\d{6}$/, message: "Mã gồm 6 chữ số" }]}>
                    <Input.OTP length={6} size="large" formatter={(v) => v.replace(/\D/g, "")} />
                </Form.Item>
                <Form.Item label="Mật khẩu mới" name="newPassword"
                    rules={[{ required: true, message: "Nhập mật khẩu mới" }, { min: 8, message: "Tối thiểu 8 ký tự" }, { max: 72 }]}>
                    <Input.Password size="large" maxLength={72} prefix={<LockOutlined />} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
                </Form.Item>
                <Form.Item label="Nhập lại mật khẩu" name="confirm" dependencies={["newPassword"]}
                    rules={[{ required: true, message: "Nhập lại mật khẩu" },
                        ({ getFieldValue }) => ({
                            validator: (_, v) => !v || v === getFieldValue("newPassword")
                                ? Promise.resolve() : Promise.reject(new Error("Mật khẩu nhập lại không khớp")),
                        })]}>
                    <Input.Password size="large" maxLength={72} prefix={<LockOutlined />} autoComplete="new-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>Đặt lại mật khẩu</Button>
            </Form>
        </AuthShell>
    );
}
