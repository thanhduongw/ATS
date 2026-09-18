import { Alert } from "antd";
import { useAppSelector } from "../../../app/hooks";
import type { UserRole } from "../../auth/types";

/**
 * Backend da tu gioi han requisition, posting va ho so theo phong ban cua quan ly,
 * nhung tren man hinh thi khong co gi noi dieu do — de manager tuong day la so lieu
 * toan cong ty va doc sai.
 */
export default function DashboardScopeNote() {
    const role = useAppSelector((s) => s.auth.user?.role) as UserRole | undefined;
    if (role !== "HIRING_MANAGER") return null;

    return (
        <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Số liệu dưới đây tính trong phạm vi phòng ban của bạn"
            description="Yêu cầu tuyển dụng, tin đăng và hồ sơ ứng viên đều đã được lọc theo phòng ban bạn phụ trách."
        />
    );
}
