import type { UserRole } from "../features/auth/types";

export function defaultRouteForRole(role: UserRole): string {
    if (role === "CANDIDATE") return "/my-home"; // C20 Tổng quan
    // R01 / H01: màn chính của Chuyên viên tuyển dụng và Đại diện phòng ban là "Việc của tôi".
    if (role === "RECRUITER" || role === "HIRING_MANAGER") return "/my-work";
    return "/dashboard";
}

/**
 * Trang mở ngay sau khi đăng nhập. Ứng viên về trang chủ công ty C01 (quyết định 13/11/2026); khu cá nhân mở từ
 * menu tài khoản. Vai trò nội bộ vào trang chính của vai trò. `?redirect=` của ứng viên (C04) xử lý ở nơi gọi.
 */
export function afterLoginRoute(role: UserRole): string {
    return role === "CANDIDATE" ? "/careers/home" : defaultRouteForRole(role);
}
