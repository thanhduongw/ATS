import { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { resetPassword } from "../authApi";
import type { ApiMessageResponse, ResetPasswordRequest } from "../types";

const { Title, Text } = Typography;

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
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
            <Card style={{ width: 440, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <Title level={3} style={{ textAlign: "center", marginBottom: 8 }}>
                    Đặt lại mật khẩu
                </Title>
                <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
                    Nhập mã OTP 6 số nhận được từ Email để tạo mật khẩu mới.
                </Text>

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
                        <Input placeholder="vd: iuhtech" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email" },
                            { type: "email", message: "Email không hợp lệ" },
                        ]}
                    >
                        <Input placeholder="admin@iuhtech.com" size="large" />
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
                            placeholder="123456"
                            size="large"
                            maxLength={6}
                            style={{ letterSpacing: 4, fontWeight: "bold", textAlign: "center" }}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu mới" },
                            { min: 8, message: "Mật khẩu mới phải từ 8 ký tự trở lên" },
                        ]}
                    >
                        <Input.Password placeholder="Nhập mật khẩu mới" size="large" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ marginTop: 12 }}>
                        Xác Nhận Đặt Lại Mật Khẩu
                    </Button>
                </Form>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                    Quay lại <a onClick={() => navigate("/login")}>Đăng nhập</a>
                </div>
            </Card>
        </div>
    );
}
