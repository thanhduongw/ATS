import type { ReactNode } from "react";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { COLORS, RADIUS } from "../../app/theme";

interface StatTileProps {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    /** Màu nhấn của ô — dùng cho icon và viền khi đang bật. */
    accent?: string;
    /** Bật viền/nền nhấn khi ô đang được dùng làm bộ lọc. */
    active?: boolean;
    /** Có onClick thì ô trở thành nút lọc nhanh. */
    onClick?: () => void;
    hint?: string;
    /** Đơn vị hiển thị sau con số (vd "%", "ngày"). */
    suffix?: string;
    /** % thay đổi so với kỳ trước — dương là mũi tên lên xanh, âm là mũi tên xuống đỏ. */
    trend?: number;
}

/**
 * Ô số liệu phẳng, gọn — dùng thống nhất ở đầu các trang danh sách
 * (Phỏng vấn, Ứng viên, Hồ sơ ứng tuyển, Tuyển dụng, Danh mục).
 * Bấm vào để lọc nhanh khi có onClick.
 */
export default function StatTile({
    icon,
    label,
    value,
    accent = COLORS.primary,
    active,
    onClick,
    hint,
    suffix,
    trend,
}: StatTileProps) {
    const clickable = !!onClick;
    const trendUp = trend !== undefined && trend >= 0;

    return (
        <div
            onClick={onClick}
            style={{
                flex: 1,
                minWidth: 150,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: RADIUS.lg,
                border: `1px solid ${active ? accent : COLORS.borderLight}`,
                background: active ? `${accent}0D` : "#FFFFFF",
                cursor: clickable ? "pointer" : "default",
                transition: "border-color 0.15s ease, background 0.15s ease",
            }}
        >
            <span
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: `${accent}14`,
                    color: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                }}
            >
                {icon}
            </span>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, lineHeight: 1.15 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>
                        {value}
                    </span>
                    {suffix && (
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{suffix}</span>
                    )}
                    {trend !== undefined && (
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: trendUp ? COLORS.success : COLORS.error,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                            }}
                        >
                            {trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {hint ? `${label} · ${hint}` : label}
                </div>
            </div>
        </div>
    );
}
