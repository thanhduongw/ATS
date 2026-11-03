import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, Spin } from "antd";
import { LockOutlined, UserAddOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInvitation, getInvitation } from "../authApi";
import type { ApiMessageResponse, InvitationPreviewResponse } from "../types";
import { ROLE_NAME } from "../../admin/adminLabels";
import { InlineNotice } from "../../../components/ui/designKit";
import { COLORS } from "../../../app/theme";

/**
 * Nhận lời mời (liên kết "Đặt mật khẩu & bắt đầu" trong email ở A04).
 * Quy tắc mật khẩu theo M09: ít nhất 8 ký tự, có chữ và số.
 */
export default function AcceptInvitePage() {
    const { token = "" } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [invite, setInvite] = useState<InvitationPreviewResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getInvitation(token)
            .then((r) => setInvite(r.data))
            .catch((err: AxiosError<ApiMessageResponse>) =>
                setError(err.response?.data?.message ?? "Lời mời không hợp lệ hoặc đã hết hạn."))
            .finally(() => setLoading(false));
    }, [token]);

    const onFinish = async (v: { password: string }) => {
        setSubmitting(true);
        try {
            await acceptInvitation(token, v.password);
            message.success("Đã kích hoạt tài khoản. Hãy đăng nhập.");
            navigate("/login", { replace: true, state: { email: invite?.email } });
        } catch (err) {
            const e = err as AxiosError<ApiMessageResponse>;
            message.error(e.response?.data?.message ?? "Không kích hoạt được tài khoản");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-center-page">
            <Card className="auth-center-card">
                <div className="auth-card-logo"><UserAddOutlined /></div>
                {loading ? (
                    <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
                ) : error || !invite ? (
                    <>
                        <div className="auth-form-header"><h2>Không mở được lời mời</h2></div>
                        <InlineNotice tone="danger">{error ?? "Lời mời không hợp lệ."}</InlineNotice>
                        <Button block style={{ marginTop: 16 }} onClick={() => navigate("/login")}>Về đăng nhập</Button>
                    </>
                ) : (
                    <>
                        <div className="auth-form-header">
                            <h2>Đặt mật khẩu & bắt đầu</h2>
                            <p>
                                Chào {invite.fullName}, {invite.invitedByName} mời bạn tham gia
                                {invite.roleName ? ` với vai trò ${ROLE_NAME[invite.roleName]}` : ""}.
                            </p>
                        </div>
                        {invite.message && (
                            <p style={{ fontStyle: "italic", color: COLORS.textSecondary }}>“{invite.message}”</p>
                        )}
                        <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
                            <Form.Item label="Email">
                                <Input value={invite.email} disabled />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label="Mật khẩu mới"
                                extra="Ít nhất 8 ký tự, có chữ và số"
                                rules={[
                                    { required: true, message: "Vui lòng nhập mật khẩu" },
                                    { min: 8, message: "Ít nhất 8 ký tự" },
                                    { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: "Có cả chữ và số" },
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label="Nhập lại mật khẩu"
                                dependencies={["password"]}
                                rules={[
                                    { required: true, message: "Vui lòng nhập lại mật khẩu" },
                                    ({ getFieldValue }) => ({
                                        validator: (_, v) => (!v || v === getFieldValue("password")
                                            ? Promise.resolve()
                                            : Promise.reject(new Error("Mật khẩu nhập lại không khớp"))),
                                    }),
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined />} />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
                                Lưu mật khẩu
                            </Button>
                        </Form>
                    </>
                )}
            </Card>
        </div>
    );
}
