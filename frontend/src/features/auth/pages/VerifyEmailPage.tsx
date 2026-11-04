import { useEffect, useState } from "react";
import { App, Button, Form, Input } from "antd";
import type { AxiosError } from "axios";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { resendOtp, verifyEmail } from "../authApi";
import type { ApiMessageResponse } from "../types";
import AuthShell from "../components/AuthShell";
import { COLORS } from "../../../app/theme";

/**
 * C06 · Xác minh email: 6 ô mã, "Gửi lại sau 0:42" (đếm ngược 60 giây), "Đổi email khác".
 * Email lấy từ bước đăng ký; vào thẳng trang này mà không có email thì về đăng ký.
 */
const RESEND_SECONDS = 60;

export default function VerifyEmailPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const email = ((location.state ?? {}) as { email?: string }).email ?? "";
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [wait, setWait] = useState(RESEND_SECONDS);

    useEffect(() => {
        if (wait <= 0) return;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    if (!email) return <Navigate to={`/register${location.search}`} replace />;

    const submit = async () => {
        if (!/^\d{6}$/.test(code)) { setError("Nhập đủ 6 chữ số"); return; }
        setSubmitting(true);
        try {
            await verifyEmail({ email, otpCode: code });
            message.success("Đã xác minh email. Mời bạn đăng nhập.");
            navigate(`/login${location.search}`, { state: { email }, replace: true });
        } catch (err) {
            // Backend trả câu không dấu ("OTP khong hop le…") → hiện câu của giao diện cho lỗi 4xx.
            const status = (err as AxiosError<ApiMessageResponse>).response?.status ?? 0;
            setError(status >= 400 && status < 500 ? "Mã không đúng hoặc đã hết hạn" : "Không xác minh được, vui lòng thử lại");
        } finally { setSubmitting(false); }
    };

    const resend = async () => {
        try {
            await resendOtp({ email });
            message.success("Đã gửi mã mới");
            setWait(RESEND_SECONDS);
        } catch (err) {
            message.error((err as AxiosError<ApiMessageResponse>).response?.data?.message ?? "Không gửi lại được mã");
        }
    };

    return (
        <AuthShell tagline="Sắp xong rồi" title="Xác minh email" subtitle={<>Mã 6 số đã gửi tới <b>{email}</b></>}>
            <Form layout="vertical" onFinish={submit}>
                <Form.Item validateStatus={error ? "error" : ""} help={error}>
                    <Input.OTP length={6} size="large" value={code} formatter={(v) => v.replace(/\D/g, "")}
                        onChange={(v) => { setCode(v); setError(null); }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={submitting} disabled={code.length !== 6}>Xác minh</Button>
            </Form>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textSecondary }}>
                <span>
                    Chưa nhận được mã?{" "}
                    {wait > 0 ? `Gửi lại sau 0:${String(wait).padStart(2, "0")}` : <a onClick={resend}>Gửi lại</a>}
                </span>
                <a onClick={() => navigate(`/register${location.search}`)}>Đổi email khác</a>
            </div>
        </AuthShell>
    );
}
