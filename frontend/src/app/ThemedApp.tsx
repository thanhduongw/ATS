import SessionExpiredDialog from "../components/SessionExpiredDialog";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import AppRoutes from "../routes/AppRoutes";
import { useMemo } from "react";
import { buildAtsTheme } from "./theme";
import { BrandProvider, useBrand } from "./BrandProvider";
import { useI18n } from "../i18n/useI18n";

function Themed() {
    const { lang } = useI18n();
    const { palette } = useBrand();
    const theme = useMemo(() => buildAtsTheme(palette), [palette]);
    return (
        <ConfigProvider theme={theme} locale={lang === "vi" ? viVN : enUS}>
            {/* Thông báo nổi nằm dưới thanh trên cùng (60px) để không che ô tìm kiếm. */}
            <AntApp message={{ top: 72 }}><AppRoutes /><SessionExpiredDialog /></AntApp>
        </ConfigProvider>
    );
}

/** Màu thương hiệu của doanh nghiệp (mục 4.1) bọc ngoài cùng để mọi màn — kể cả trang công khai — dùng chung. */
export function ThemedApp() {
    return <BrandProvider><Themed /></BrandProvider>;
}
