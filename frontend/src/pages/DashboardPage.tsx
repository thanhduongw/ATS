import { Button, Card, Typography, Descriptions } from "antd";
import { logout as logoutAction } from "../features/auth/authSlice.ts";
import { logoutRequest } from "../features/auth/authApi.ts";
import { useAppDispatch, useAppSelector } from "../app/hooks";

const { Title } = Typography;

export default function DashboardPage() {
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
        <div style={{ padding: 40 }}>
            <Card>
                <Title level={3}>Dashboard</Title>
                <Descriptions column={1}>
                    <Descriptions.Item label="User ID">{user?.userId}</Descriptions.Item>
                    <Descriptions.Item label="Tenant ID">{user?.tenantId}</Descriptions.Item>
                    <Descriptions.Item label="Role">{user?.role}</Descriptions.Item>
                </Descriptions>
                <Button danger onClick={handleLogout} style={{ marginTop: 16 }}>
                    Đăng xuất
                </Button>
            </Card>
        </div>
    );
}