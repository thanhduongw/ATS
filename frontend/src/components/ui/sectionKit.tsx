import { Tooltip } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { COLORS, RADIUS } from "../../app/theme";

/* ============================================================
   Bộ khối dựng dùng chung cho các modal chi tiết / form:
   section header có icon, khung section, cặp nhãn–giá trị và
   khối văn bản dài. Dùng ở cả module Tuyển dụng và Phỏng vấn
   để giao diện đồng nhất.
============================================================ */

function hasValue(value: React.ReactNode) {
    return value !== null && value !== undefined && value !== "";
}

/* ============================================================
   SECTION HEADER
============================================================ */

export function SectionHeader({
    icon,
    title,
    subtitle,
    extra,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    extra?: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${COLORS.primary}12`,
                    color: COLORS.primary,
                    fontSize: 16,
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.3 }}>
                    {title}
                </div>

                {subtitle && (
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                        {subtitle}
                    </div>
                )}
            </div>

            {extra}
        </div>
    );
}

/* ============================================================
   SECTION CONTAINER
============================================================ */

export function SectionContainer({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div
            style={{
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: RADIUS.lg,
                padding: 12,
                background: "#FFFFFF",
                marginBottom: 12,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

/* ============================================================
   INFO FIELD
============================================================ */

export function InfoField({
    label,
    value,
    icon,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
}) {
    if (!hasValue(value)) return null;

    return (
        <div style={{ minWidth: 0 }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: COLORS.textMuted,
                    marginBottom: 4,
                    fontWeight: 500,
                }}
            >
                {icon && <span style={{ fontSize: 12, color: COLORS.textMuted }}>{icon}</span>}
                {label}
            </div>

            <div
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                <Tooltip title={typeof value === "string" ? value : undefined}>{value}</Tooltip>
            </div>
        </div>
    );
}

/* ============================================================
   TEXT BLOCK
============================================================ */

export function TextBlock({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;

    return (
        <div
            style={{
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: RADIUS.md,
                padding: "4px 8px",
                background: "#FAFBFC",
                height: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 8,
                    fontSize: 12,
                    color: COLORS.textMuted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                }}
            >
                <FileTextOutlined />
                {label}
            </div>

            <div style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {value}
            </div>
        </div>
    );
}
