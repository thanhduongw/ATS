import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import { COLORS } from "../app/theme";
import SiteHeader from "./SiteHeader";
import { useCompanyBrand } from "./siteBrand";

const { Content, Footer } = Layout;

/**
 * Khung trang tuyển dụng công khai (C01, C02, C03, C09, C10): header website dùng chung với khu ứng viên
 * (`SiteHeader` — Trang chủ · Việc làm), nội dung rộng tối đa 1200px, chân trang tên công ty.
 */
export default function PublicLayout() {
    const { name } = useCompanyBrand();
    return (
        <Layout style={{ minHeight: "100vh", background: COLORS.body }}>
            <SiteHeader />
            {/* overflowX clip: dải nền tràn ngang (C02 dùng 100vw) không sinh thanh cuộn ngang. */}
            <Content style={{ flex: 1, overflowX: "clip" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 40px" }}>
                    <Outlet />
                </div>
            </Content>
            <Footer style={{ textAlign: "center", color: COLORS.textSecondary, background: COLORS.cardBg, fontSize: 13 }}>
                © {new Date().getFullYear()} {name ?? "ATS"}
            </Footer>
        </Layout>
    );
}
