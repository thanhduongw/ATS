import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import AppRoutes from "../routes/AppRoutes";
import { atsTheme } from "./theme";
import { useI18n } from "../i18n/useI18n";

export function ThemedApp() {
    const { lang } = useI18n();
    return (
        <ConfigProvider theme={atsTheme} locale={lang === "vi" ? viVN : enUS}>
            <AntApp><AppRoutes /></AntApp>
        </ConfigProvider>
    );
}
