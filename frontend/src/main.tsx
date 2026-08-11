import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import { store } from "./app/store";
import AppRoutes from "./routes/AppRoutes";
import { atsTheme } from "./app/theme";
import "./index.css";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";

function ThemedApp() {
  const { lang } = useI18n();
  return (
    <ConfigProvider theme={atsTheme} locale={lang === "vi" ? viVN : enUS}>
      <AntApp><AppRoutes /></AntApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider><BrowserRouter><ThemedApp /></BrowserRouter></I18nProvider>
    </Provider>
  </StrictMode>,
);