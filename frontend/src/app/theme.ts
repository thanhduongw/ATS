import type { ThemeConfig } from "antd";

/*
 * Token giao diện web — nguồn: docs/UI "Interactive UI Prototype.html"
 *   DS01 (Màu sắc) và DS02 (Chữ · Khoảng cách · Bo góc · Đổ bóng).
 * Quy tắc DS01: chữ và đường kẻ là CÙNG một màu #182431 ở các độ trong suốt khác nhau,
 * không dùng nhiều màu xám khác nhau.
 * Tên các khoá cũ (primaryLight, header, stageNew…) được giữ để không vỡ các màn đang dùng;
 * giá trị đã đổi theo thiết kế.
 */

/* ── Color Palette (DS01) ─────────────────────────────────── */
export const COLORS = {
    /* Thương hiệu */
    primary: "#0A59F7",
    /** Trạng thái nhấn / di chuột của nút chính. */
    primaryHover: "#0848C7",
    /** Nền 10%: mục menu đang chọn, nút phụ màu xanh. */
    primarySoft: "#0A59F719",
    /** Nền 6%: dòng được chọn, thông báo chưa đọc. */
    primaryFaint: "#0A59F70F",
    /** Khoá cũ — nay trỏ về màu nhấn của thiết kế. */
    primaryLight: "#0848C7",
    primaryDark: "#0848C7",
    /** Xanh đậm: nền màn chào, trang tuyển dụng công khai. */
    navy: "#061A44",
    /** Xanh đậm 2: điểm đầu dải màu thư mời, ảnh bìa. */
    navy2: "#0B2F78",
    /** Khoá cũ — giữ cho các màn chưa chuyển. */
    accent: "#0A59F719",
    accentWarm: "#FF7500",

    /* Bề mặt */
    /** Thanh trên dùng cùng nền trang (DS04: không có thanh màu riêng). */
    header: "#F1F3F5",
    headerGradient: "#F1F3F5",
    siderBg: "#F1F3F5",
    body: "#F1F3F5",
    cardBg: "#FFFFFF",

    /* Ngữ nghĩa — mỗi màu đi kèm một nền nhạt cho thẻ trạng thái */
    success: "#00A06B",
    successBg: "#00CB8724",
    warning: "#FF7500",
    warningBg: "#FF75001F",
    error: "#FA2A2D",
    errorBg: "#FA2A2D17",
    /** Tím: phỏng vấn, đề xuất đổi giờ, cần sửa. */
    interview: "#7C4DFF",
    interviewBg: "#7C4DFF1A",
    info: "#0A59F7",

    /* Chữ — cùng màu #182431 ở các độ trong suốt */
    textPrimary: "#182431",
    /** 60%: mô tả, nhãn trường, cột bảng. */
    textSecondary: "#18243199",
    /** 40%: gợi ý trong ô nhập, mũi tên dòng, ô trống. */
    textMuted: "#18243166",
    textOnDark: "#FFFFFF",

    /* Đường kẻ & nền ô */
    /** 10%: viền bảng, đường phân cách 0.5px. */
    border: "#1824311A",
    borderLight: "#1824311A",
    divider: "#1824311A",
    /** 5%: ô nhập, nút trung tính, thẻ phụ. */
    fill: "#1824310C",

    /* Khoá cũ của kanban — nay trỏ về màu giai đoạn DS01 */
    stageNew: "#18243166",
    stageScreening: "#00A06B",
    stageInterview: "#7C4DFF",
    stageOffer: "#FF7500",
    stageHired: "#0A59F7",
    stageRejected: "#FA2A2D",
} as const;

/* ── Giai đoạn tuyển dụng (DS01, DS06) ───────────────────────
 * 6 giai đoạn cố định, CÙNG một màu ở thẻ trạng thái, thanh tiến trình, phễu và biểu đồ. */
export type FixedStage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";

export const FIXED_STAGES: readonly FixedStage[] = [
    "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED",
] as const;

export const STAGE_COLORS: Record<FixedStage, { color: string; bg: string; text: string }> = {
    APPLIED: { color: "#18243166", bg: "#1824310C", text: "#18243199" },
    SCREENING: { color: "#00A06B", bg: "#00CB8724", text: "#00A06B" },
    INTERVIEW: { color: "#7C4DFF", bg: "#7C4DFF1A", text: "#7C4DFF" },
    OFFER: { color: "#FF7500", bg: "#FF75001F", text: "#FF7500" },
    HIRED: { color: "#0A59F7", bg: "#0A59F719", text: "#0A59F7" },
    REJECTED: { color: "#FA2A2D", bg: "#FA2A2D17", text: "#FA2A2D" },
};

/* ── Sắc độ thẻ trạng thái (DS06 "Màu trạng thái") ─────────── */
export type StatusTone = "neutral" | "success" | "interview" | "warning" | "brand" | "danger";

export const TONES: Record<StatusTone, { bg: string; text: string }> = {
    neutral: { bg: "#1824310C", text: "#18243199" },
    success: { bg: "#00CB8724", text: "#00A06B" },
    interview: { bg: "#7C4DFF1A", text: "#7C4DFF" },
    warning: { bg: "#FF75001F", text: "#FF7500" },
    brand: { bg: "#0A59F719", text: "#0A59F7" },
    danger: { bg: "#FA2A2D17", text: "#FA2A2D" },
};

/* ── Ảnh đại diện (DS01): màu gán theo người, giữ nguyên ở mọi màn ── */
export const AVATAR_PALETTE = [
    "#0A59F7", "#7C4DFF", "#E40078", "#00A06B",
    "#FF7500", "#0D9488", "#3F56EA", "#C2410C",
] as const;

/** Chọn màu ảnh đại diện ổn định theo khoá (id hoặc tên). */
export function avatarColor(key: string | number | null | undefined): string {
    const s = String(key ?? "");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/* ── Dải màu AI (DS01) ──────────────────────────────────────
 * CHỈ dùng cho thứ do AI tạo ra: điểm AI, nhãn AI. Không dùng làm nền nút hay trang trí. */
export const AI_GRADIENT = "linear-gradient(135deg, #42CBF7, #2A7DFF 40%, #A479FF 75%, #FF678C)";

/* ── Gradient Presets ────────────────────────────────────────
 * Thiết kế phẳng: chỉ còn dải màu xanh đậm cho thư mời / ảnh bìa (DS01 "Xanh đậm 2").
 * Các khoá stat* cũ trỏ về màu đặc để các màn chưa chuyển không còn gradient. */
export const GRADIENTS = {
    primary: COLORS.primary,
    header: COLORS.header,
    hero: "linear-gradient(170deg, #061A44, #0B2F78 55%, #0A59F7)",
    offer: "linear-gradient(135deg, #0B2F78, #0A59F7)",
    card: COLORS.cardBg,
    accent: COLORS.primarySoft,
    warm: COLORS.warningBg,
    stat1: "#0A59F7",
    stat2: "#00A06B",
    stat3: "#FF7500",
    stat4: "#7C4DFF",
} as const;

/* ── Đổ bóng (DS02): giao diện phẳng, chỉ lớp nổi trên cùng mới có bóng ── */
export const SHADOWS = {
    none: "none",
    /** Ô đang chọn của nút phân đoạn. */
    segmented: "0 1px 3px #1824311F",
    /** Thông báo nổi (toast). */
    toast: "0 8px 24px #18243133",
    /** Hộp thoại, bảng trượt. */
    dialog: "0 24px 64px #18243140",
    /* Khoá cũ — thẻ và bảng tách bằng nền trắng trên nền xám, không có bóng. */
    sm: "none",
    md: "none",
    lg: "none",
    xl: "0 24px 64px #18243140",
    card: "none",
    cardHover: "none",
    sidebar: "none",
    dropdown: "0 8px 24px #18243133",
} as const;

/* ── Khoảng cách (DS02): bước 4px ─────────────────────────── */
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    /** Lề nội dung web. */
    page: 24,
    /** Khoảng cách giữa các khối. */
    block: 16,
    /** Đệm trong thẻ. */
    card: 20,
} as const;

/* ── Bo góc (DS02) ───────────────────────────────────────── */
export const RADIUS = {
    /** Thẻ nhỏ. */
    sm: 6,
    /** Ô biểu tượng. */
    md: 12,
    /** Thẻ / bảng. */
    lg: 20,
    /** Thẻ lớn. */
    xl: 24,
    /** Hộp thoại. */
    dialog: 28,
    /** Bảng trượt. */
    sheet: 32,
    /** Nút, chip, ô tìm kiếm: bo tròn hoàn toàn (bằng nửa chiều cao). */
    full: 9999,
} as const;

/* ── Khung web (DS02) ─────────────────────────────────────── */
export const LAYOUT = {
    siderWidth: 232,
    headerHeight: 60,
    designWidth: 1440,
} as const;

/* ── Ant Design Theme Config ───────────────────────────────── */
export const atsTheme: ThemeConfig = {
    token: {
        /* Colors */
        colorPrimary: COLORS.primary,
        colorPrimaryHover: COLORS.primaryHover,
        colorPrimaryActive: COLORS.primaryHover,
        colorSuccess: COLORS.success,
        colorWarning: COLORS.warning,
        colorError: COLORS.error,
        colorInfo: COLORS.info,
        colorLink: COLORS.primary,
        colorLinkHover: COLORS.primaryHover,
        colorTextBase: COLORS.textPrimary,
        colorText: COLORS.textPrimary,
        colorTextSecondary: COLORS.textSecondary,
        colorTextTertiary: COLORS.textSecondary,
        colorTextQuaternary: COLORS.textMuted,
        colorTextPlaceholder: COLORS.textMuted,
        colorBorder: COLORS.border,
        colorBorderSecondary: COLORS.border,
        colorSplit: COLORS.border,
        colorFillTertiary: COLORS.fill,
        colorFillQuaternary: COLORS.fill,
        colorBgBase: "#FFFFFF",
        colorBgLayout: COLORS.body,
        colorBgContainer: COLORS.cardBg,

        /* Màu preset của antd (Tag color="purple"…) lấy theo bảng màu DS01,
         * để các màn chưa chuyển sang StatusTag vẫn đúng tông thiết kế. */
        blue: COLORS.primary,
        geekblue: COLORS.primary,
        green: COLORS.success,
        lime: COLORS.success,
        cyan: "#0D9488",
        purple: COLORS.interview,
        orange: COLORS.warning,
        gold: COLORS.warning,
        yellow: COLORS.warning,
        volcano: COLORS.warning,
        red: COLORS.error,
        magenta: "#E40078",
        pink: "#E40078",

        /* Typography (DS02 · Web): nội dung 14/400, nhãn 12, nhỏ 11.
         * Font Be Vietnam Pro theo quyết định A5 (thay HarmonyOS Sans của HTML). */
        fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: 14,
        fontSizeSM: 12,
        fontSizeLG: 16,
        fontSizeHeading1: 26,
        fontSizeHeading2: 20,
        fontSizeHeading3: 16,
        fontSizeHeading4: 14,
        fontWeightStrong: 600,

        /* Shape */
        borderRadius: RADIUS.md,
        borderRadiusLG: RADIUS.lg,
        borderRadiusSM: RADIUS.sm,
        borderRadiusXS: 4,
        lineWidth: 1,

        /* Flat (DS02) */
        boxShadow: SHADOWS.dropdown,
        boxShadowSecondary: SHADOWS.dropdown,
        boxShadowTertiary: "none",

        /* Spacing */
        marginLG: SPACING.lg,
        paddingLG: SPACING.card,

        /* Motion */
        motionDurationMid: "0.2s",
        motionDurationSlow: "0.3s",
        motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
    components: {
        Layout: {
            headerBg: COLORS.header,
            siderBg: COLORS.siderBg,
            bodyBg: COLORS.body,
            headerHeight: LAYOUT.headerHeight,
            headerPadding: "0 24px 0 4px",
        },
        Menu: {
            itemBg: "transparent",
            subMenuItemBg: "transparent",
            itemSelectedBg: COLORS.primarySoft,
            itemSelectedColor: COLORS.primary,
            itemHoverBg: COLORS.fill,
            itemActiveBg: COLORS.primarySoft,
            itemColor: COLORS.textPrimary,
            itemBorderRadius: 12,
            itemHeight: 36,
            itemMarginInline: 0,
            iconSize: 18,
            groupTitleColor: COLORS.textSecondary,
            groupTitleFontSize: 12,
            activeBarBorderWidth: 0,
        },
        Card: {
            borderRadiusLG: RADIUS.lg,
            paddingLG: SPACING.card,
            boxShadowTertiary: "none",
            headerFontSize: 16,
        },
        Table: {
            headerBg: COLORS.cardBg,
            headerColor: COLORS.textSecondary,
            headerSplitColor: "transparent",
            rowHoverBg: COLORS.primaryFaint,
            rowSelectedBg: COLORS.primaryFaint,
            rowSelectedHoverBg: COLORS.primarySoft,
            borderColor: COLORS.border,
            headerBorderRadius: RADIUS.lg,
            cellPaddingBlock: 12,
            cellPaddingInline: 20,
            cellFontSize: 14,
        },
        /* DS03: mọi nút bo tròn hoàn toàn; nút chính cao 34–40px; nút phụ chữ xanh trên nền xám nhạt. */
        Button: {
            borderRadius: 17,
            borderRadiusLG: 20,
            borderRadiusSM: 14,
            controlHeight: 34,
            controlHeightLG: 40,
            controlHeightSM: 28,
            paddingInline: 17,
            fontWeight: 500,
            primaryShadow: "none",
            defaultShadow: "none",
            dangerShadow: "none",
            defaultBg: COLORS.fill,
            defaultBorderColor: "transparent",
            defaultColor: COLORS.textPrimary,
            defaultHoverBg: "#18243119",
            defaultHoverBorderColor: "transparent",
            defaultHoverColor: COLORS.textPrimary,
            defaultActiveBg: "#18243119",
            defaultActiveBorderColor: "transparent",
            defaultActiveColor: COLORS.textPrimary,
        },
        /* DS03: ô nhập cao 38px, bo tròn, nền xám nhạt, không viền. */
        Input: {
            borderRadius: 19,
            controlHeight: 38,
            controlHeightLG: 44,
            colorBgContainer: COLORS.fill,
            colorBorder: "transparent",
            hoverBorderColor: COLORS.border,
            activeBorderColor: COLORS.primary,
            activeShadow: "none",
            hoverBg: COLORS.fill,
            activeBg: "#FFFFFF",
        },
        InputNumber: {
            borderRadius: 19,
            controlHeight: 38,
            colorBgContainer: COLORS.fill,
            colorBorder: "transparent",
            activeShadow: "none",
        },
        Select: {
            borderRadius: 19,
            controlHeight: 38,
            colorBgContainer: COLORS.fill,
            colorBorder: "transparent",
            activeOutlineColor: "transparent",
            optionSelectedBg: COLORS.primarySoft,
        },
        DatePicker: {
            borderRadius: 19,
            controlHeight: 38,
            colorBgContainer: COLORS.fill,
            colorBorder: "transparent",
            activeShadow: "none",
        },
        Modal: {
            borderRadiusLG: RADIUS.dialog,
            titleFontSize: 20,
            contentBg: "#FFFFFF",
            headerBg: "#FFFFFF",
        },
        Drawer: {
            paddingLG: 24,
        },
        Tabs: {
            inkBarColor: COLORS.primary,
            itemSelectedColor: COLORS.primary,
            itemHoverColor: COLORS.primaryHover,
            itemColor: COLORS.textSecondary,
            titleFontSize: 14,
        },
        Tag: {
            borderRadiusSM: RADIUS.sm,
            defaultBg: COLORS.fill,
            defaultColor: COLORS.textSecondary,
        },
        /* DS03: nút phân đoạn — ô chọn nền trắng có bóng nhẹ trên nền xám. */
        Segmented: {
            borderRadius: 16,
            borderRadiusSM: 12,
            trackBg: COLORS.fill,
            trackPadding: 4,
            itemSelectedBg: "#FFFFFF",
            itemSelectedColor: COLORS.textPrimary,
            itemColor: COLORS.textSecondary,
            itemHoverColor: COLORS.textPrimary,
            boxShadowTertiary: SHADOWS.segmented,
        },
        Checkbox: {
            borderRadiusSM: 6,
            controlInteractiveSize: 20,
        },
        Radio: {
            radioSize: 20,
        },
        Switch: {
            colorPrimary: COLORS.primary,
            colorPrimaryHover: COLORS.primaryHover,
        },
        Descriptions: {
            labelBg: COLORS.cardBg,
            labelColor: COLORS.textSecondary,
        },
        Statistic: {
            titleFontSize: 12,
            contentFontSize: 26,
        },
        Badge: {
            colorError: COLORS.error,
        },
        Message: {
            contentBg: "#FFFFFF",
        },
    },
};
