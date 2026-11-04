import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { defaultRouteForRole } from "../app/roleNavigation";

/**
 * Trang chỉ dành cho khách (đăng nhập, đăng ký…). Đã đăng nhập thì chuyển đi:
 * ứng viên có ?redirect= nội bộ (C04 — quay lại biểu mẫu ứng tuyển) thì về đó, còn lại về trang chính của vai trò.
 * Phải xử lý ở đây vì khi đăng nhập xong, component này chuyển trang trước cả lệnh navigate của LoginPage.
 */
export default function GuestRoute() {
    const { accessToken, user } = useAppSelector((state) => state.auth);
    const { search } = useLocation();
    if (!accessToken || !user) return <Outlet />;
    const redirect = new URLSearchParams(search).get("redirect");
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
    return <Navigate to={user.role === "CANDIDATE" && safe ? safe : defaultRouteForRole(user.role)} replace />;
}
