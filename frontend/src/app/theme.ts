import type { ThemeConfig } from "antd";

export const COLORS = { header: "#0B3B36", primary: "#0E7A5F", accent: "#D9F99D", body: "#F3F4F6" };

export const atsTheme: ThemeConfig = {
    token: {
        colorPrimary: COLORS.primary,
        colorSuccess: "#22C55E", colorWarning: "#F59E0B", colorError: "#DC2626", colorInfo: "#3B82F6",
        borderRadius: 8,
        fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
    },
    components: {
        Layout: { headerBg: COLORS.header, siderBg: COLORS.header, bodyBg: COLORS.body },
        Menu: {
            itemSelectedBg: "#D9F99D55", itemSelectedColor: COLORS.header,
            darkItemBg: "transparent", darkSubMenuItemBg: "transparent",
            darkItemSelectedBg: COLORS.accent, darkItemSelectedColor: COLORS.header,
            darkItemColor: "rgba(255,255,255,0.75)", darkItemHoverColor: "#fff",
        },
        Card: { borderRadiusLG: 12 },
        Table: { headerBg: "#F8FAFC" },
    },
};