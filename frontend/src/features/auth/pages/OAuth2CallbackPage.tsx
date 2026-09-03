import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Spin } from "antd";
import { jwtDecode } from "jwt-decode";
import type { AxiosError } from "axios";
import { exchangeOAuth2Code } from "../authApi";
import { setCredentials } from "../authSlice";
import { useAppDispatch } from "../../../app/hooks";
import { defaultRouteForRole } from "../../../app/roleNavigation";
import type { ApiMessageResponse, JwtPayload } from "../types";

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
            .then((response) => {
                const payload = jwtDecode<JwtPayload>(response.data.accessToken);
                dispatch(setCredentials(response.data));
                message.success("Đăng nhập thành công");
                navigate(defaultRouteForRole(payload.role), { replace: true });
            })
            .catch((error) => {
                const apiError = error as AxiosError<ApiMessageResponse>;
                message.error(apiError.response?.data?.message ?? "Đăng nhập bằng Google thất bại");
                navigate("/login", { replace: true });
            });
    }, [dispatch, message, navigate, searchParams]);

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
            <Spin size="large" tip="Đang đăng nhập..." />
        </div>
    );
}
