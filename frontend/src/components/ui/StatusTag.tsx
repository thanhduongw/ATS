import type { CSSProperties } from "react";
import { TONES, type StatusTone } from "../../app/theme";
import { toneOf } from "./statusTone";

/**
 * Thẻ trạng thái — DS03 "Thẻ trạng thái": chấm tròn + chữ, cao 22px, bo tròn hoàn toàn.
 * Chỉ dùng cho TRẠNG THÁI. Nhãn phân loại (phòng ban, kỹ năng…) dùng LabelTag.
 * Bảng sắc độ theo DS06 "Màu trạng thái".
 *
 * `color` nhận tên preset cũ của antd (success, processing, purple…) để các màn đang dùng
 * không phải sửa; `tone` là cách viết mới.
 */
interface StatusTagProps {
    label: string;
    tone?: StatusTone;
    /** Tên preset antd cũ — được quy về tone. */
    color?: string;
    style?: CSSProperties;
}

export default function StatusTag({ label, tone, color, style }: StatusTagProps) {
    const t = TONES[tone ?? toneOf(color)];
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 22,
                padding: "0 10px",
                borderRadius: 13,
                background: t.bg,
                color: t.text,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                lineHeight: 1,
                ...style,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: t.text, flexShrink: 0 }} />
            {label}
        </span>
    );
}
