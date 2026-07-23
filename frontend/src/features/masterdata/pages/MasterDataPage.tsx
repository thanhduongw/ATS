import { Card, Tabs } from "antd";
import type { TabsProps } from "antd";
import CatalogPanel from "../components/CatalogPanel";
import PipelinePanel from "../components/PipelinePanel";
import { catalogConfigs } from "../catalogConfigs";

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
            <Card>
                <Tabs tabPosition="left" items={items} style={{ minHeight: 560 }} />
            </Card>
        </div>
    );
}