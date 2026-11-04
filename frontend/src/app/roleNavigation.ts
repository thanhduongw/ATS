import type { UserRole } from "../features/auth/types";

export function defaultRouteForRole(role: UserRole): string {
    if (role === "CANDIDATE") return "/my-home"; // C20 Tổng quan
    // R01 / H01: màn chính của Chuyên viên tuyển dụng và Đại diện phòng ban là "Việc của tôi".
    if (role === "RECRUITER" || role === "HIRING_MANAGER") return "/my-work";
    return "/dashboard";
}
