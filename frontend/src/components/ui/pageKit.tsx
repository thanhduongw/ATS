import type { ReactNode } from "react";
import { Button, Tooltip, Popconfirm } from "antd";
import { COLORS, RADIUS } from "../../app/theme";

/* ============================================================
   Các khối bố cục dùng chung cho trang danh sách, để mọi module
   (Phỏng vấn, Ứng viên, Tuyển dụng, Danh mục) có cùng nhịp
   khoảng cách 12px và cùng cách sắp xếp toolbar / bộ lọc.
============================================================ */

/** Hàng ô số liệu đầu trang. */
export function StatRow({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
            {children}
        </div>
    );
}

/**
 * Hàng công cụ: cụm bên trái (tiêu đề / điều hướng) và cụm bên phải
 * (đổi chế độ xem, nút hành động chính).
 */
export function PageToolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
                flexShrink: 0,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{left}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{right}</div>
        </div>
    );
}

/** Hàng bộ lọc: các ô lọc bên trái, chú thích / phụ trợ bên phải. */
export function FilterBar({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
                flexShrink: 0,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>{children}</div>
            {extra && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>{extra}</div>
            )}
        </div>
    );
}

/** Nút hành động chỉ có icon kèm tooltip — chuẩn cho cột "Thao tác" trong bảng. */
export function IconAction({
    title,
    icon,
    onClick,
    danger,
    loading,
    accent,
    confirm,
}: {
    title: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
    loading?: boolean;
    /** Tô màu icon để nhấn hành động chính (ví dụ Đăng tin, Gửi duyệt). */
    accent?: string;
    /** Hỏi xác nhận trước khi chạy onClick — dùng cho hành động khó hoàn tác. */
    confirm?: { title: string; description?: string; okText?: string };
}) {
    const button = (
        <Tooltip title={title}>
            <Button
                size="small"
                type="text"
                danger={danger}
                loading={loading}
                icon={<span style={accent ? { color: accent } : undefined}>{icon}</span>}
                onClick={confirm ? undefined : onClick}
            />
        </Tooltip>
    );

    if (!confirm) return button;

    return (
        <Popconfirm
            title={confirm.title}
            description={confirm.description}
            onConfirm={onClick}
            okText={confirm.okText ?? "Xác nhận"}
            cancelText="Hủy"
            okButtonProps={{ danger }}
        >
            {button}
        </Popconfirm>
    );
}

/**
 * Tiêu đề modal chuẩn: ô icon bo góc + tiêu đề 18/700 + phụ đề 12/muted.
 * Dùng cho mọi modal tạo/sửa để đồng nhất giữa các module.
 */
export function ModalTitle({
    icon,
    title,
    subtitle,
    accent = COLORS.primary,
}: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    accent?: string;
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
            <span
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: RADIUS.md,
                    background: `${accent}14`,
                    color: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                }}
            >
                {icon}
            </span>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.3 }}>
                    {title}
                </div>
                {subtitle && (
                    <div style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted, marginTop: 2 }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

/* Hằng số style/phân trang dùng chung nằm ở ./listStyles.ts */
