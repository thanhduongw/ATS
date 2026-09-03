import { Button, Layout, Space, Typography } from "antd";
import { LoginOutlined } from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router-dom";
import { COLORS, GRADIENTS } from "../app/theme";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export default function PublicLayout() {
    const navigate = useNavigate();

    return (
        <Layout style={{ minHeight: "100vh", background: COLORS.body }}>
            <Header style={{
                background: GRADIENTS.header,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                height: 64,
            }}>
                <Space size={12} style={{ cursor: "pointer" }} onClick={() => navigate("/careers")}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.15)",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                    }}>ATS</div>
                    <Title level={5} style={{ color: "#fff", margin: 0 }}>Career Portal</Title>
                </Space>
                <Button icon={<LoginOutlined />} onClick={() => navigate("/login")}>Đăng nhập</Button>
            </Header>
            <Content style={{ flex: 1 }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 40px" }}>
                    <Outlet />
                </div>
            </Content>
            <Footer style={{ textAlign: "center", color: COLORS.textMuted }}>
                ATS - Hệ thống quản lý tuyển dụng
            </Footer>
        </Layout>
    );
}
