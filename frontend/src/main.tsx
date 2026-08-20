import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./app/store";
import { ThemedApp } from "./app/ThemedApp";
import "./index.css";
import { I18nProvider } from "./i18n/I18nProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider><BrowserRouter><ThemedApp /></BrowserRouter></I18nProvider>
    </Provider>
  </StrictMode>,
);