import type { ThemeConfig } from "antd";

/* ── Color Palette ─────────────────────────────────────────── */
export const COLORS = {
    /* Brand */
    primary: "#0E7A5F",
    primaryLight: "#10B981",
    primaryDark: "#065F46",
    accent: "#D9F99D",
    accentWarm: "#FBBF24",

    /* Surfaces */
    header: "#0B3B36",
    headerGradient: "linear-gradient(135deg, #0B3B36 0%, #134E48 100%)",
    siderBg: "#FFFFFF",
    body: "#F0F2F5",
    cardBg: "#FFFFFF",

    /* Semantic */
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#DC2626",
    info: "#3B82F6",

    /* Text */
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    textOnDark: "#F9FAFB",

    /* Borders & Dividers */
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    divider: "#E5E7EB",

    /* Kanban stage colors */
    stageNew: "#3B82F6",
    stageScreening: "#8B5CF6",
    stageInterview: "#F59E0B",
    stageOffer: "#10B981",
    stageHired: "#22C55E",
    stageRejected: "#EF4444",
} as const;

/* ── Gradient Presets ──────────────────────────────────────── */
export const GRADIENTS = {
    primary: "linear-gradient(135deg, #0E7A5F 0%, #10B981 100%)",
    header: "linear-gradient(135deg, #0B3B36 0%, #134E48 100%)",
    hero: "linear-gradient(135deg, #0B3B36 0%, #065F46 50%, #0E7A5F 100%)",
    card: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
    accent: "linear-gradient(135deg, #D9F99D 0%, #BEF264 100%)",
    warm: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
    stat1: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    stat2: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    stat3: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    stat4: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
} as const;

/* ── Shadow Tokens ─────────────────────────────────────────── */
export const SHADOWS = {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    cardHover: "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
    sidebar: "2px 0 8px rgba(0,0,0,0.04)",
    dropdown: "0 6px 16px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.06)",
} as const;

/* ── Spacing Scale ─────────────────────────────────────────── */
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    page: 24,
} as const;

/* ── Border Radius ─────────────────────────────────────────── */
export const RADIUS = {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const;

/* ── Ant Design Theme Config ───────────────────────────────── */
export const atsTheme: ThemeConfig = {
    token: {
        /* Colors */
        colorPrimary: COLORS.primary,
        colorSuccess: COLORS.success,
        colorWarning: COLORS.warning,
        colorError: COLORS.error,
        colorInfo: COLORS.info,
        colorTextBase: COLORS.textPrimary,
        colorBgBase: "#FFFFFF",

        /* Typography */
        fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
        fontSize: 14,
        fontSizeHeading1: 30,
        fontSizeHeading2: 24,
        fontSizeHeading3: 20,
        fontSizeHeading4: 16,
        fontSizeLG: 16,

        /* Shape */
        borderRadius: RADIUS.md,
        borderRadiusLG: RADIUS.lg,
        borderRadiusSM: RADIUS.sm,

        /* Spacing */
        marginLG: SPACING.lg,
        paddingLG: SPACING.lg,

        /* Motion */
        motionDurationMid: "0.25s",
        motionDurationSlow: "0.35s",
        motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
    components: {
        Layout: {
            headerBg: COLORS.header,
            siderBg: COLORS.siderBg,
            bodyBg: COLORS.body,
            headerHeight: 60,
            headerPadding: "0 24px",
        },
        Menu: {
            itemSelectedBg: "rgba(14, 122, 95, 0.08)",
            itemSelectedColor: COLORS.primary,
            itemHoverBg: "rgba(14, 122, 95, 0.04)",
            itemBorderRadius: RADIUS.md,
            itemMarginInline: 8,
            iconSize: 18,
        },
        Card: {
            borderRadiusLG: RADIUS.lg,
            paddingLG: 20,
        },
        Table: {
            headerBg: "#F8FAFC",
            headerColor: COLORS.textSecondary,
            rowHoverBg: "rgba(14, 122, 95, 0.02)",
            borderColor: COLORS.borderLight,
            headerBorderRadius: RADIUS.md,
        },
        Button: {
            borderRadius: RADIUS.md,
            controlHeight: 36,
            controlHeightLG: 44,
            primaryShadow: "0 2px 4px rgba(14, 122, 95, 0.2)",
        },
        Input: {
            borderRadius: RADIUS.md,
            controlHeight: 40,
            controlHeightLG: 48,
            activeBorderColor: COLORS.primary,
            hoverBorderColor: COLORS.primaryLight,
        },
        Select: {
            borderRadius: RADIUS.md,
            controlHeight: 40,
        },
        Modal: {
            borderRadiusLG: RADIUS.xl,
            titleFontSize: 18,
        },
        Drawer: {
            paddingLG: 24,
        },
        Tabs: {
            inkBarColor: COLORS.primary,
            itemSelectedColor: COLORS.primary,
            itemHoverColor: COLORS.primaryLight,
        },
        Tag: {
            borderRadiusSM: 6,
        },
        Segmented: {
            borderRadius: RADIUS.md,
            itemSelectedBg: COLORS.primary,
            itemSelectedColor: "#FFFFFF",
        },
        Descriptions: {
            labelBg: "#F8FAFC",
        },
        Statistic: {
            titleFontSize: 13,
            contentFontSize: 28,
        },
    },
};