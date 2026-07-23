import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { App, ConfigProvider } from "antd";
import { store } from "./app/store";
import AppRoutes from "./routes/AppRoutes";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Không tìm thấy phần tử #root trong index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
          <App>
            <AppRoutes />
          </App>
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);