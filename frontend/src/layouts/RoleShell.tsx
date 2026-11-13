import { useAppSelector } from "../app/hooks";
import AppLayout from "./AppLayout";
import CandidateLayout from "./CandidateLayout";

/**
 * Chọn khung theo vai trò cho các trang cần đăng nhập: ứng viên dùng khung website (CandidateLayout — C20),
 * admin / HR / phòng ban dùng khung ứng dụng nội bộ (AppLayout — DS04). Trang dùng chung như /notifications,
 * /settings tự nằm đúng khung của người đang xem.
 */
export default function RoleShell() {
    const role = useAppSelector((s) => s.auth.user?.role);
    return role === "CANDIDATE" ? <CandidateLayout /> : <AppLayout />;
}
