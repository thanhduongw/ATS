import { Layout, Typography, Button, Space } from "antd";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { HomeOutlined, LoginOutlined } from "@ant-design/icons";
import { COLORS, GRADIENTS } from "../app/theme";

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;

interface PublicLayoutProps {
    companyName?: string;
}

export default function PublicLayout({ companyName }: PublicLayoutProps) {
    const navigate = useNavigate();
    const { tenantCode } = useParams<{ tenantCode: string }>();

    return (
        <Layout style={{ minHeight: "100vh", background: COLORS.body }}>
            <Header
                style={{
                    background: GRADIENTS.header,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 32px",
                    height: 64,
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
            >
                <Space
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                        tenantCode
                            ? navigate(`/c/${tenantCode}`)
                            : navigate("/")
                    }
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 14,
                        }}
                    >
                        ATS
                    </div>
                    <div>
                        <Title
                            level={5}
                            style={{
                                color: "#fff",
                                margin: 0,
                                lineHeight: 1.2,
                                fontWeight: 600,
                            }}
                        >
                            {companyName || "Career Portal"}
                        </Title>
                        {tenantCode && (
                            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                                {tenantCode}
                            </Text>
                        )}
                    </div>
                </Space>

                <Space>
                    {tenantCode && (
                        <Button
                            type="text"
                            icon={<HomeOutlined />}
                            style={{ color: "#fff" }}
                            onClick={() => navigate(`/c/${tenantCode}`)}
                        >
                            Việc làm
                        </Button>
                    )}
                    <Button
                        icon={<LoginOutlined />}
                        onClick={() => navigate("/login")}
                        style={{
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.25)",
                            color: "#fff",
                        }}
                    >
                        Đăng nhập HR
                    </Button>
                </Space>
            </Header>

            <Content
                style={{
                    maxWidth: 1100,
                    width: "100%",
                    margin: "0 auto",
                    padding: "32px 24px 48px",
                    overflow: "auto",
                }}
            >
                <Outlet context={{ companyName }} />
            </Content>

            <Footer
                style={{
                    textAlign: "center",
                    background: "transparent",
                    color: COLORS.textMuted,
                    fontSize: 13,
                    padding: "16px 24px 24px",
                }}
            >
                Powered by ATS · Hệ thống Quản lý Tuyển dụng
            </Footer>
        </Layout>
    );
}