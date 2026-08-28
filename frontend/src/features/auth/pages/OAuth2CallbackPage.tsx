import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin, App } from "antd";
import type { AxiosError } from "axios";
import { exchangeOAuth2Code } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "../../../app/hooks";
import type { ApiMessageResponse } from "../types";

/** Đích redirect sau khi Google SSO thành công — đổi mã dùng-một-lần lấy token thật rồi vào dashboard. */
export default function OAuth2CallbackPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const exchangedRef = useRef(false);

    useEffect(() => {
        if (exchangedRef.current) return;
        exchangedRef.current = true;

        const code = searchParams.get("code");
        if (!code) {
            message.error("Thiếu mã đăng nhập, vui lòng thử lại");
            navigate("/login", { replace: true });
            return;
        }

        exchangeOAuth2Code(code)
            .then((res) => {
                dispatch(setCredentials(res.data));
                message.success("Đăng nhập thành công");
                navigate("/dashboard", { replace: true });
            })
            .catch((err) => {
                const axiosErr = err as AxiosError<ApiMessageResponse>;
                message.error(axiosErr.response?.data?.message ?? "Đăng nhập bằng Google thất bại");
                navigate("/login", { replace: true });
            });
    }, [searchParams, dispatch, navigate, message]);

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Spin size="large" tip="Đang đăng nhập..." />
        </div>
    );
}
