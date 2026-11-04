import { useEffect, useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { LockOutlined } from "@ant-design/icons";
import axios, { type AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { setSessionExpiredHandler } from "../services/axiosClient";
import { API_BASE_URL } from "../config";
import { logout, setCredentials } from "../features/auth/authSlice";
import type { ApiMessageResponse, LoginResponse } from "../features/auth/types";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { COLORS } from "../app/theme";

/**
 * C34 · Phiên đăng nhập đã hết hạn: hộp đăng nhập lại ngay trên trang hiện tại, dữ liệu đang nhập được giữ.
 * Đăng nhập lại bằng CHÍNH tài khoản cũ (email cố định); muốn đổi tài khoản thì chọn "Đăng xuất".
 */
export default function SessionExpiredDialog() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const email = useAppSelector((s) => s.auth.user?.email ?? "");
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSessionExpiredHandler(() => { setPassword(""); setError(null); setOpen(true); });
        return () => setSessionExpiredHandler(null);
    }, []);

    const relogin = async () => {
        if (!password) return;
        setBusy(true);
        try {
            // Gọi thẳng axios (không qua axiosClient): interceptor của axiosClient sẽ cố làm mới token cũ đã hết hạn trước.
            const r = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, password });
            dispatch(setCredentials(r.data));
            setOpen(false);
            message.success("Đã đăng nhập lại. Bạn có thể tiếp tục.");
        } catch (err) {
            setError((err as AxiosError<ApiMessageResponse>).response?.status === 401 ? "Mật khẩu không đúng" : "Không đăng nhập được, thử lại");
        } finally { setBusy(false); }
    };

    const leave = () => {
        setOpen(false);
        dispatch(logout());
        navigate("/login", { replace: true });
    };

    return (
        <Modal open={open} closable={false} maskClosable={false} keyboard={false} width={400} footer={null} centered>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Phiên đăng nhập đã hết hạn</span>
                <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
                    Đăng nhập lại để tiếp tục. Dữ liệu đang nhập sẽ được giữ.
                </span>
                <Input value={email} disabled size="large" />
                <Input.Password size="large" prefix={<LockOutlined />} placeholder="Mật khẩu" autoFocus autoComplete="current-password"
                    status={error ? "error" : undefined} value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }} onPressEnter={relogin} />
                {error && <span style={{ fontSize: 12, color: COLORS.error, marginTop: -6 }}>{error}</span>}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
                    <Button type="text" onClick={leave}>Đăng xuất</Button>
                    <Button type="primary" loading={busy} disabled={!password} onClick={relogin}>Đăng nhập lại</Button>
                </div>
            </div>
        </Modal>
    );
}
