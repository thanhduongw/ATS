import { Card, Tabs } from "antd";
import type { TabsProps } from "antd";
import CatalogPanel from "../components/CatalogPanel";
import PipelinePanel from "../components/PipelinePanel";
import { catalogConfigs } from "../catalogConfigs";
import PageHeader from "../../../components/ui/PageHeader";

export default function MasterDataPage() {
    const items: TabsProps["items"] = [
        ...catalogConfigs.map((config) => ({
            key: config.key,
            label: config.tabLabel,
            children: <CatalogPanel config={config} />,
        })),
        {
            key: "pipelines",
            label: "Quy trình tuyển dụng",
            children: <PipelinePanel />,
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <PageHeader title="Dữ liệu danh mục" subtitle="Phòng ban, chức danh, kỹ năng và quy trình tuyển dụng dùng chung" />
            <Card variant="borderless" style={{ boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
                <Tabs tabPlacement="start" items={items} style={{ minHeight: 560 }} />
            </Card>
        </div>
    );
}
