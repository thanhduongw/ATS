import type { CSSProperties } from "react";
import { Tag } from "antd";

interface StatusTagProps {
    color: string;
    label: string;
    style?: CSSProperties;
}

/**
 * Tag trạng thái dùng chung — bọc antd Tag để đồng nhất kích thước/khoảng cách chữ
 * cho mọi trạng thái workflow trong hệ thống (Requisition, Posting, Application, Offer...).
 */
export default function StatusTag({ color, label, style }: StatusTagProps) {
    return (
        <Tag color={color} style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 500, ...style }}>
            {label}
        </Tag>
    );
}
