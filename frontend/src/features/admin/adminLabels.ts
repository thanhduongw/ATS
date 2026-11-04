import type { StatusTone } from "../../app/theme";
import type { UserRole, UserStatus } from "../auth/types";

/** Tên vai trò theo DS06 "Viết chữ". */
export const ROLE_NAME: Record<UserRole, string> = {
    COMPANY_ADMIN: "Quản trị doanh nghiệp",
    RECRUITER: "Chuyên viên tuyển dụng",
    HIRING_MANAGER: "Đại diện phòng ban",
    CANDIDATE: "Ứng viên",
};

/**
 * Mô tả vai trò ở A04. HTML có lỗi chữ ("quản lý" bị thay thành "đại diện phòng ban"),
 * đã sửa theo mục 0.4 của docs/learning/03-ke-hoach-trien-khai-ui.md.
 */
export const ROLE_DESCRIPTION: Record<Exclude<UserRole, "CANDIDATE">, string> = {
    RECRUITER: "Đăng tin, quản lý ứng viên, lên lịch, gửi thư mời, sửa danh mục.",
    HIRING_MANAGER: "Tạo yêu cầu tuyển dụng, phỏng vấn và đánh giá ứng viên của phòng mình.",
    COMPANY_ADMIN: "Quản lý người dùng, thông tin doanh nghiệp và trang tuyển dụng.",
};

/** Trạng thái tài khoản (A03): Hoạt động · Chờ kích hoạt · Đã khoá. */
export const USER_STATUS_VIEW: Record<UserStatus, { label: string; tone: StatusTone }> = {
    ACTIVE: { label: "Hoạt động", tone: "success" },
    PENDING_VERIFICATION: { label: "Chờ kích hoạt", tone: "warning" },
    LOCKED: { label: "Đã khoá", tone: "danger" },
    INACTIVE: { label: "Ngừng hoạt động", tone: "neutral" },
};

/** A07 — bảng quyền cố định (đọc từ HTML, sửa lỗi chữ theo mục 0.4). */
export type PermissionCell = boolean | string;
export const PERMISSION_MATRIX: { name: string; recruiter: PermissionCell; hm: PermissionCell; admin: PermissionCell }[] = [
    { name: "Tạo và sửa yêu cầu tuyển dụng", recruiter: false, hm: true, admin: false },
    { name: "Duyệt yêu cầu tuyển dụng", recruiter: true, hm: false, admin: false },
    { name: "Đăng và quản lý việc làm", recruiter: true, hm: false, admin: false },
    { name: "Xem ứng viên", recruiter: "Tất cả", hm: "Phòng ban mình", admin: false },
    { name: "Chuyển giai đoạn, từ chối ứng viên", recruiter: true, hm: false, admin: false },
    { name: "Lên lịch phỏng vấn", recruiter: true, hm: false, admin: false },
    { name: "Phỏng vấn và nộp đánh giá", recruiter: "Khi được phân công", hm: "Khi được phân công", admin: false },
    { name: "Soạn và gửi thư mời", recruiter: true, hm: false, admin: false },
    { name: "Sửa danh mục", recruiter: true, hm: false, admin: false },
    { name: "Xem số liệu tổng hợp", recruiter: true, hm: "Phòng ban mình", admin: true },
    { name: "Quản lý người dùng", recruiter: false, hm: false, admin: true },
    { name: "Thông tin doanh nghiệp, trang tuyển dụng", recruiter: false, hm: false, admin: true },
];
