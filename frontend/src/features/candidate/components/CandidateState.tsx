import type { ReactNode } from "react";
import { Button } from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { COLORS } from "../../../app/theme";

/**
 * Trạng thái trống / lỗi trong khu ứng viên (C32, C33 của Candidate.html): ô icon 64px bo góc, tiêu đề đậm,
 * dòng phụ, nút chính có icon. Đặt trong thẻ trắng của trang (Panel / ListPage) — tự nó không có nền.
 * Khác `EmptyState` dùng chung của admin/HR (hình hộp xám của antd).
 */
export function CandidateEmpty({ icon, title, description, action }: {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return <Block icon={icon} tone="brand" title={title} description={description} action={action} />;
}

/** C33 · Lỗi tải dữ liệu: không hiện số 0 / danh sách trống, chỉ báo lỗi + "Thử lại". */
export function CandidateLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <Block
            icon={<WarningOutlined />}
            tone="danger"
            title="Không tải được dữ liệu"
            description="Kiểm tra kết nối mạng rồi thử lại."
            action={<Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRetry}>Thử lại</Button>}
        />
    );
}

function Block({ icon, tone, title, description, action }: {
    icon: ReactNode;
    tone: "brand" | "danger";
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div style={{ padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
            <span style={{
                width: 64, height: 64, borderRadius: 18, fontSize: 26, marginBottom: 8,
                background: tone === "danger" ? COLORS.errorBg : COLORS.primarySoft,
                color: tone === "danger" ? COLORS.error : COLORS.primary,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</span>
            <b style={{ fontSize: 20, color: COLORS.textPrimary }}>{title}</b>
            {description && <span style={{ fontSize: 14, color: COLORS.textSecondary }}>{description}</span>}
            {action && <div style={{ marginTop: 8 }}>{action}</div>}
        </div>
    );
}
