import { Button, Card, Typography, Descriptions, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { logout as logoutAction } from "../features/auth/authSlice";
import { logoutRequest } from "../features/auth/authApi";
import { useAppDispatch, useAppSelector } from "../app/hooks";

const { Title } = Typography;

export default function DashboardPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user, refreshToken } = useAppSelector((state) => state.auth);

    const handleLogout = async () => {
        try {
            if (refreshToken) {
                await logoutRequest(refreshToken);
            }
        } finally {
            dispatch(logoutAction());
        }
    };

    return (
        <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
            <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <Title level={3}>Bảng Điều Khiển (Dashboard ATS)</Title>
                
                <Descriptions column={1} bordered style={{ margin: "20px 0" }}>
                    <Descriptions.Item label="User ID (Mã người dùng)">{user?.userId}</Descriptions.Item>
                    <Descriptions.Item label="Tenant ID (Mã công ty)">{user?.tenantId}</Descriptions.Item>
                    <Descriptions.Item label="Role (Vai trò hiện tại)">{user?.role}</Descriptions.Item>
                </Descriptions>

                <Title level={4} style={{ marginTop: 24 }}>Chức Năng Kiểm Thử Hệ Thống:</Title>
                <Space wrap style={{ marginTop: 12 }}>
                    <Button type="primary" size="large" onClick={() => navigate("/auth-manage")}>
                        Quản Lý Auth & Profile (`/auth-manage`)
                    </Button>
                    <Button size="large" onClick={() => navigate("/masterdata")}>
                        Quản Lý Master Data (`/masterdata`)
                    </Button>
                    <Button size="large" onClick={() => navigate("/recruitment")}>
                        Quản Lý Tuyển Dụng (`/recruitment`)
                    </Button>
                    <Button danger size="large" onClick={handleLogout}>
                        Đăng Xuất
                    </Button>
                </Space>
            </Card>
        </div>
    );
}