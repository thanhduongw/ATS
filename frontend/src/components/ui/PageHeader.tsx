import type { CSSProperties, ReactNode } from "react";
import { Breadcrumb, Button, Tooltip } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { usePageTrail, useCrumbNavigate } from "../../app/useNavTrail";
import { COLORS } from "../../app/theme";

/* ============================================================
   Đầu trang chuẩn cho mọi trang chi tiết:

       Breadcrumb
       ↓
       [←] Tiêu đề + thẻ trạng thái        Nút hành động
           Dòng phụ
       ↓
       (Tabs / nội dung do trang tự dựng)

   Breadcrumb trả lời "tôi đang ở đâu trong module", sidebar trả lời "module nào",
   nên hai thứ bổ trợ nhau thay vì thay thế nhau.
============================================================ */

interface BreadcrumbProps {
    /** Nhãn của chính trang này — thường là tên thật của bản ghi đang mở. */
    crumb?: string | null;
    className?: string;
    style?: CSSProperties;
}

/**
 * Chỉ dải breadcrumb, dành cho trang đã có khối tiêu đề riêng (ví dụ thẻ định danh
 * ứng viên) — thêm PageHeader đầy đủ sẽ lặp lại tên hai lần.
 */
export function PageBreadcrumb({ crumb, className, style }: BreadcrumbProps) {
    const trail = usePageTrail(crumb);
    const goToCrumb = useCrumbNavigate();

    if (trail.length < 2) return null;

    return (
        <Breadcrumb
            className={className}
            style={{ fontSize: 13, marginBottom: 10, ...style }}
            items={trail.map((entry, index) => ({
                title: entry.to
                    ? <a onClick={() => goToCrumb(trail, index)}>{entry.label}</a>
                    : <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>{entry.label}</span>,
            }))}
        />
    );
}

interface Props extends BreadcrumbProps {
    title: ReactNode;
    /** Dòng phụ dưới tiêu đề: loại hình, địa điểm, thời gian… */
    subtitle?: ReactNode;
    /** Thẻ trạng thái đứng cùng hàng với tiêu đề. */
    tags?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export default function PageHeader({ crumb, title, subtitle, tags, actions, className, style }: Props) {
    const trail = usePageTrail(crumb);
    const goToCrumb = useCrumbNavigate();
    const parentIndex = trail.length - 2;
    const parent = parentIndex >= 0 ? trail[parentIndex] : undefined;

    return (
        <div className={className} style={{ marginBottom: 16, ...style }}>
            {trail.length > 1 && (
                <Breadcrumb
                    style={{ fontSize: 13, marginBottom: 6 }}
                    items={trail.map((entry, index) => ({
                        title: entry.to
                            ? <a onClick={() => goToCrumb(trail, index)}>{entry.label}</a>
                            : <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>{entry.label}</span>,
                    }))}
                />
            )}

            <div className="page-header" style={{ marginBottom: 0, alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                    {/* Mũi tên mang tên trang cha nên không còn là nút "Quay lại" trống nghĩa. */}
                    {parent?.to && (
                        <Tooltip title={`Quay lại ${parent.label}`}>
                            <Button
                                type="text"
                                aria-label={`Quay lại ${parent.label}`}
                                icon={<ArrowLeftOutlined />}
                                onClick={() => goToCrumb(trail, parentIndex)}
                                style={{ marginTop: 2, flexShrink: 0, color: COLORS.textSecondary }}
                            />
                        </Tooltip>
                    )}
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.3,
                                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                            }}
                        >
                            {title}
                            {tags}
                        </div>
                        {subtitle && (
                            <div className="page-header-subtitle" style={{ marginTop: 2 }}>{subtitle}</div>
                        )}
                    </div>
                </div>

                {actions && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
