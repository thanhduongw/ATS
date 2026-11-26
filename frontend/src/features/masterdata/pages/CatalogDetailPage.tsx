import { Navigate, useParams } from "react-router-dom";
import { catalogByKey, HIDDEN_CATALOGS, SPECIAL_CATALOGS } from "../catalogConfigs";
import CatalogPanel from "../components/CatalogPanel";
import EmailTemplatePanel from "../components/EmailTemplatePanel";
import { PageBreadcrumb } from "../../../components/ui/PageHeader";
import { Panel } from "../../../components/ui/designKit";

/** R36 · R37 · R38 — trang một danh mục (`/masterdata/:key`). */
export default function CatalogDetailPage() {
    const { key } = useParams<{ key: string }>();

    // Danh mục đã ẩn (kỹ năng, trường tuỳ chỉnh): mở bằng đường dẫn cũ thì quay về trang Danh mục.
    if (!key || HIDDEN_CATALOGS.includes(key)) return <Navigate to="/masterdata" replace />;

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
