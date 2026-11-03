import { Card, Tabs, Grid } from "antd";
import type { TabsProps } from "antd";
import { FormOutlined } from "@ant-design/icons";
import CatalogPanel from "../components/CatalogPanel";
import EmailTemplatePanel from "../components/EmailTemplatePanel";
import CustomFieldDefinitionPanel from "../components/CustomFieldDefinitionPanel";
import { catalogConfigs } from "../catalogConfigs";
import { COLORS, RADIUS } from "../../../app/theme";

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
        // Quy trình tuyển dụng (pipeline) không còn hiện ở Danh mục: thiết kế dùng 6 giai đoạn cố định
        // cho mọi vị trí (DS06, R41, quyết định B1). PipelinePanel vẫn giữ trong code.
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
            {/*
              Ghi chú: trang này CHỦ ĐỘNG không dùng bố cục "1 màn hình không cuộn" như các
              trang khác — tabPlacement="start" có thể tới 16 mục dọc, cao hơn vùng hiển thị
              trên nhiều màn hình. antd tự quản lý scroll của thanh tab dọc bằng JS nội bộ,
              ép CSS overflow lên đó gây xung đột (tab không chọn được — xem index.css).
              Nên vẫn giữ cuộn trang tự nhiên; các bảng bên trong vẫn dùng size="small" để
              hiện được nhiều dòng hơn.
            */}
            <Card style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: RADIUS.lg }}>
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
