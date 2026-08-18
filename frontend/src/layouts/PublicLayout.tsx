import {
    Layout,
    Typography,
    Space,
} from "antd";
import {
    Outlet,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    COLORS,
    GRADIENTS,
} from "../app/theme";

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;

interface PublicLayoutProps {
    companyName?: string;
}

export default function PublicLayout({
    companyName,
}: PublicLayoutProps) {
    const navigate = useNavigate();

    const { tenantCode } =
        useParams<{
            tenantCode: string;
        }>();

    const handleGoHome = () => {
        // Chỉ điều hướng khi có tenantCode hợp lệ.
        // Không còn fallback về trang đăng nhập ("/") khi
        // không xác định được công ty.
        if (tenantCode) {
            navigate(`/c/${tenantCode}`);
        }
    };

    return (
        <Layout
            style={{
                // Neo trực tiếp vào viewport bằng position: fixed + inset: 0
                // thay vì height: 100% — cách này KHÔNG phụ thuộc vào việc
                // các phần tử cha (trong AppRoutes/App.tsx) có truyền
                // height: 100% xuống hay không. Đây là nguyên nhân khiến
                // Content bị cắt thay vì scroll ở bản trước.
                position: "fixed",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                background: COLORS.body,
            }}
        >
            {/* =========================
                HEADER
            ========================== */}
            <Header
                style={{
                    background: GRADIENTS.header,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        "space-between",
                    padding: "0 24px",
                    height: 64,
                    lineHeight: "normal",
                    flexShrink: 0,
                    boxShadow:
                        "0 2px 8px rgba(0,0,0,0.12)",
                }}
            >
                {/* BRAND */}
                <Space
                    size={12}
                    style={{
                        cursor: "pointer",
                        minWidth: 0,
                    }}
                    onClick={handleGoHome}
                >
                    {/* ATS Logo */}
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            minWidth: 36,
                            borderRadius: 8,
                            background:
                                "rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 14,
                            flexShrink: 0,
                        }}
                    >
                        ATS
                    </div>

                    {/* Company name */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection:
                                "column",
                            justifyContent:
                                "center",
                            minWidth: 0,
                        }}
                    >
                        <Title
                            level={5}
                            style={{
                                color: "#fff",
                                margin: 0,
                                lineHeight: 1.25,
                                fontWeight: 600,
                                fontSize: 16,
                                overflow:
                                    "hidden",
                                textOverflow:
                                    "ellipsis",
                                whiteSpace:
                                    "nowrap",
                            }}
                        >
                            {companyName ||
                                "Career Portal"}
                        </Title>

                        {tenantCode && (
                            <Text
                                style={{
                                    color:
                                        "rgba(255,255,255,0.7)",
                                    fontSize: 12,
                                    lineHeight: 1.2,
                                }}
                            >
                                {tenantCode}
                            </Text>
                        )}
                    </div>
                </Space>
            </Header>

            {/* =========================
                CONTENT
                Đây là vùng scroll duy nhất của trang public.
                flex: 1 + minHeight: 0 lấy phần chiều cao còn lại
                sau Header (vì Layout cha đã fixed đúng viewport),
                overflowY: auto tạo thanh cuộn khi nội dung dài hơn.
            ========================== */}
            <Content
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    background: COLORS.body,
                }}
            >
                <div
                    style={{
                        maxWidth: 1100,
                        width: "100%",
                        margin: "0 auto",
                        padding:
                            "28px 24px 40px",
                        boxSizing:
                            "border-box",
                    }}
                >
                    <Outlet
                        context={{
                            companyName,
                        }}
                    />
                </div>

                {/* =========================
                    FOOTER
                ========================== */}
                <Footer
                    style={{
                        textAlign: "center",
                        background:
                            "transparent",
                        color:
                            COLORS.textMuted,
                        fontSize: 13,
                        padding:
                            "12px 24px 20px",
                    }}
                >
                    Powered by ATS · Hệ thống
                    Quản lý Tuyển dụng
                </Footer>
            </Content>
        </Layout>
    );
}