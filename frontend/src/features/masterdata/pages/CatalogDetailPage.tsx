import { Navigate, useParams } from "react-router-dom";
import { catalogByKey, SPECIAL_CATALOGS } from "../catalogConfigs";
import CatalogPanel from "../components/CatalogPanel";
import EmailTemplatePanel from "../components/EmailTemplatePanel";
import CustomFieldDefinitionPanel from "../components/CustomFieldDefinitionPanel";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { Panel } from "../../../components/ui/designKit";

/** R36 · R37 · R38 — trang một danh mục (`/masterdata/:key`). */
export default function CatalogDetailPage() {
    const { key } = useParams<{ key: string }>();

    if (key === SPECIAL_CATALOGS.customFields) {
        return (
            <>
                <PageBreadcrumb crumb="Trường tuỳ chỉnh" />
                <Panel><CustomFieldDefinitionPanel /></Panel>
            </>
        );
    }

    const config = catalogByKey(key);
    if (!config) return <Navigate to="/masterdata" replace />;

    if (config.key === SPECIAL_CATALOGS.emailTemplates) {
        return (
            <>
                <PageBreadcrumb crumb={config.title} />
                <Panel><EmailTemplatePanel config={config} /></Panel>
            </>
        );
    }

    // key làm React key để đổi danh mục thì panel tạo lại state (ô tìm kiếm, bộ lọc).
    return <CatalogPanel key={config.key} config={config} breadcrumb={<PageBreadcrumb crumb={config.title} />} />;
}
