import { Card, Tabs, Grid } from "antd";
import type { TabsProps } from "antd";
import { DatabaseOutlined, ApartmentOutlined, FormOutlined } from "@ant-design/icons";
import CatalogPanel from "../components/CatalogPanel";
import EmailTemplatePanel from "../components/EmailTemplatePanel";
import PipelinePanel from "../components/PipelinePanel";
import CustomFieldDefinitionPanel from "../components/CustomFieldDefinitionPanel";
import { catalogConfigs } from "../catalogConfigs";
import { GRADIENTS } from "../../../app/theme";

const { useBreakpoint } = Grid;

export default function MasterDataPage() {
    const screens = useBreakpoint();
    // Tabs dọc bên trái chiếm nhiều bề ngang trên màn hình nhỏ — chuyển sang tabs ngang khi < md
    const tabPlacement = screens.md ? "start" : "top";

    const items: TabsProps["items"] = [
        ...catalogConfigs.map((config) => ({
            key: config.key,
            label: config.tabLabel,
            children: config.key === "emailTemplates"
                ? <EmailTemplatePanel config={config} />
                : <CatalogPanel config={config} />,
        })),
        {
            key: "pipelines",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ApartmentOutlined />Quy trình tuyển dụng
                </span>
            ),
            children: <PipelinePanel />,
        },
        {
            key: "customFields",
            label: (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FormOutlined />Trường tùy chỉnh
                </span>
            ),
            children: <CustomFieldDefinitionPanel />,
        },
    ];

    return (
        <div className="page-container animate-fade-in">
            {/* ── Page Header ──────────────────── */}
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div className="page-header-title">
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: GRADIENTS.stat4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20,
                    }}>
                        <DatabaseOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Danh mục hệ thống</h2>
                        <div className="page-header-subtitle">Quản lý danh mục dùng chung: kỹ năng, học vấn, hình thức tuyển dụng, quy trình...</div>
                    </div>
                </div>
            </div>

            <Card style={{ border: "none" }}>
                <Tabs
                    tabPlacement={tabPlacement}
                    items={items}
                    style={{ minHeight: 560 }}
                    size="large"
                />
            </Card>
        </div>
    );
}
