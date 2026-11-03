import type { ReactNode } from "react";
import { COLORS, RADIUS } from "../../app/theme";
import { IconTile } from "./designKit";

interface StatCardProps {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
    hint?: string;
    accentColor?: string;
}

/**
 * Thẻ chỉ số — DS04 "Thẻ chỉ số": nhãn 12 · số 26/800 · mô tả 11, căn trái, nền trắng bo 20,
 * không bóng. Giữ props cũ (icon, accentColor) để các màn đang dùng không phải sửa.
 */
export default function StatCard({ icon, label, value, hint, accentColor = COLORS.primary }: StatCardProps) {
    return (
        <section
            style={{
                background: COLORS.cardBg, borderRadius: RADIUS.lg, padding: 20, height: "100%",
                display: "flex", gap: 12, alignItems: "flex-start",
            }}
        >
            {icon && <IconTile icon={icon} color={accentColor} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{label}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1.2 }}>{value}</span>
                {hint && <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{hint}</span>}
            </div>
        </section>
    );
}
