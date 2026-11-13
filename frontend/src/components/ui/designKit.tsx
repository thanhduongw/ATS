import type { CSSProperties, ReactNode } from "react";
import { Modal } from "antd";
import {
    AI_GRADIENT, COLORS, RADIUS, SHADOWS, STAGE_COLORS, TONES, avatarColor,
    type FixedStage, type StatusTone,
} from "../../app/theme";
import { initialsOf } from "./uiHelpers";

/* ============================================================
   Bộ component dùng chung theo hệ thống thiết kế docs/UI
   (DS03 "Component web · Cơ bản", DS04 "Component web · Mẫu ghép").
   Màu, bo góc, bóng chỉ lấy từ app/theme.ts.
============================================================ */

/* ── Nhãn (DS03 "Nhãn") — thông tin phân loại, không có chấm ── */
export function LabelTag({
    children, color, style,
}: { children: ReactNode; color?: string; style?: CSSProperties }) {
    return (
        <span
            style={{
                display: "inline-flex", alignItems: "center", gap: 4, height: 22, padding: "0 10px",
                borderRadius: 11, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1,
                background: color ? `${color}1F` : COLORS.fill,
                color: color ?? COLORS.textSecondary,
                ...style,
            }}
        >
            {children}
        </span>
    );
}

/* ── Điểm AI (DS01, DS03): luôn dùng dải màu AI ─────────────── */
export function AiScorePill({
    score, suffix, size = "md",
}: { score: number; suffix?: string; size?: "sm" | "md" | "lg" }) {
    const h = size === "lg" ? 32 : size === "sm" ? 20 : 24;
    return (
        <span
            style={{
                display: "inline-flex", alignItems: "center", gap: 4, height: h,
                padding: `0 ${size === "sm" ? 7 : 10}px`, borderRadius: h / 2, background: AI_GRADIENT,
                color: "#FFFFFF", fontSize: size === "lg" ? 15 : 12, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1,
            }}
        >
            {score}
            {suffix && <span style={{ fontWeight: 500 }}>{suffix}</span>}
        </span>
    );
}

/* ── Ảnh đại diện (DS03): chữ cái đầu trên màu cố định theo người ── */
export function Avatar({
    name, colorKey, size = 34, style, src,
}: { name?: string | null; colorKey?: string | number | null; size?: number; style?: CSSProperties; src?: string | null }) {
    if (src) {
        return (
            <img src={src} alt={name ?? ""} width={size} height={size}
                style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0, ...style }} />
        );
    }
    return (
        <span
            aria-label={name ?? undefined}
            style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: size, height: size, borderRadius: size / 2, flexShrink: 0,
                background: avatarColor(colorKey ?? name), color: "#FFFFFF",
                fontSize: Math.max(9, Math.round(size * 0.36)), fontWeight: 700,
                ...style,
            }}
        >
            {initialsOf(name)}
        </span>
    );
}

/** Nhóm người chồng −8px (DS03). */
export function AvatarGroup({
    people, size = 24,
}: { people: { name?: string | null; key?: string | number | null }[]; size?: number }) {
    return (
        <span style={{ display: "inline-flex" }}>
            {people.map((p, i) => (
                <Avatar
                    key={`${p.key ?? p.name}-${i}`} name={p.name} colorKey={p.key} size={size}
                    style={{ marginLeft: i === 0 ? 0 : -8, boxShadow: "0 0 0 2px #FFFFFF" }}
                />
            ))}
        </span>
    );
}

/* ── Ô biểu tượng (DS03): 36px, nền 12% của màu ────────────── */
export function IconTile({
    icon, color = COLORS.primary, size = 36,
}: { icon: ReactNode; color?: string; size?: number }) {
    return (
        <span
            style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: size, height: size, borderRadius: RADIUS.md, background: `${color}1F`, color,
                fontSize: Math.round(size * 0.5),
            }}
        >
            {icon}
        </span>
    );
}

/* ── Thanh giai đoạn (DS03): số ứng viên theo giai đoạn, cao 8px ── */
export function StageBar({
    counts, width,
}: { counts: Partial<Record<FixedStage, number>>; width?: number | string }) {
    const order: FixedStage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];
    const parts = order.filter((s) => (counts[s] ?? 0) > 0);
    return (
        <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", width, background: parts.length ? undefined : COLORS.fill }}>
            {parts.map((s) => (
                <span key={s} style={{ flex: counts[s], background: STAGE_COLORS[s].color }} />
            ))}
        </div>
    );
}

/* ── Thẻ chỉ số (DS04): nhãn 12 · số 26/800 · mô tả 11 ─────── */
export function MetricCard({
    label, value, hint, delta, deltaGood = true, outlined = false,
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    /** Chênh lệch so với kỳ trước, ví dụ "+1", "−3". */
    delta?: string;
    /** Chênh lệch này là tốt (xanh) hay xấu (đỏ). */
    deltaGood?: boolean;
    outlined?: boolean;
}) {
    return (
        <section
            style={{
                background: COLORS.cardBg, borderRadius: RADIUS.lg, padding: outlined ? 16 : 20,
                display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0,
                boxShadow: outlined ? `inset 0 0 0 1px ${COLORS.border}` : undefined,
            }}
        >
            <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.2 }}>{value}</span>
                {delta && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: deltaGood ? COLORS.success : COLORS.error }}>{delta}</span>
                )}
            </span>
            {hint && <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{hint}</span>}
        </section>
    );
}

/* ── Thông báo trong trang (DS04) ──────────────────────────── */
export function InlineNotice({
    tone = "brand", icon, children, action,
}: { tone?: StatusTone; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
    const bg = tone === "brand" ? COLORS.primaryFaint : TONES[tone].bg;
    return (
        <div
            style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                borderRadius: 16, background: bg, fontSize: 14, color: COLORS.textPrimary,
            }}
        >
            {icon && <span style={{ color: TONES[tone].text, display: "inline-flex" }}>{icon}</span>}
            <span style={{ flexGrow: 1 }}>{children}</span>
            {action}
        </div>
    );
}

/* ── Thẻ trắng (DS04): nền trắng bo 20, đệm 20, không bóng ──── */
export function Panel({
    title, subtitle, extra, children, style, bodyGap = 10,
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    extra?: ReactNode;
    children?: ReactNode;
    style?: CSSProperties;
    bodyGap?: number;
}) {
    return (
        <section
            style={{
                background: COLORS.cardBg, borderRadius: RADIUS.lg, padding: 20,
                display: "flex", flexDirection: "column", gap: bodyGap, minWidth: 0, ...style,
            }}
        >
            {(title || extra) && (
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        {title && <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{title}</span>}
                        {subtitle && <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{subtitle}</span>}
                    </div>
                    {extra}
                </div>
            )}
            {children}
        </section>
    );
}

/* ── Hộp thoại nhỏ (DS04): rộng 420, bo 28, chỉ cho xác nhận hoặc 1–3 trường ── */
export function SmallDialog({
    open, title, subtitle, children, onCancel, onOk, okText, cancelText = "Huỷ",
    danger = false, okLoading = false, okDisabled = false, width = 420,
}: {
    open: boolean;
    title: ReactNode;
    subtitle?: ReactNode;
    children?: ReactNode;
    onCancel: () => void;
    onOk: () => void;
    /** Nút là động từ (DS06), ví dụ "Chuyển", "Từ chối ứng viên". */
    okText: string;
    cancelText?: string;
    /** Hành động không hoàn tác được → nút đỏ (DS06). */
    danger?: boolean;
    okLoading?: boolean;
    okDisabled?: boolean;
    width?: number;
}) {
    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={onOk}
            okText={okText}
            cancelText={cancelText}
            okButtonProps={{ danger, loading: okLoading, disabled: okDisabled, size: "large" }}
            cancelButtonProps={{ size: "large" }}
            width={width}
            centered
            destroyOnHidden
            styles={{ container: { borderRadius: RADIUS.dialog, padding: 24, boxShadow: SHADOWS.dialog } }}
            title={
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>{title}</span>
                    {subtitle && <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textSecondary }}>{subtitle}</span>}
                </div>
            }
        >
            {children}
        </Modal>
    );
}

/* ── Tiêu đề màn chính (DS02: 26/700, cách chữ −0.01em) ─────── */
export function ScreenTitle({
    title, subtitle, actions,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                    {title}
                </span>
                {subtitle && <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{subtitle}</span>}
            </div>
            {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}
        </div>
    );
}
