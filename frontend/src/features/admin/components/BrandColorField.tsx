import { Button, ColorPicker } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { COLORS } from "../../../app/theme";
import { DEFAULT_BRAND, MIN_CONTRAST, contrastRatio, ensureContrast, isHexColor } from "../../../app/brand";

/** Vài màu gợi ý, đều đạt tương phản 4,5:1 với chữ trắng. */
const PRESETS = [DEFAULT_BRAND, "#0F6E66", "#1D4ED8", "#6D28D9", "#B4233A", "#B45309", "#1F2A44"];

/** Ô chọn màu thương hiệu cho Form.Item: bảng màu + các màu gợi ý. Giá trị là "#RRGGBB" hoặc rỗng (mặc định). */
export function BrandColorField({ value, onChange }: { value?: string | null; onChange?: (v: string) => void }) {
    const current = isHexColor(value) ? value.toUpperCase() : DEFAULT_BRAND;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <ColorPicker disabledAlpha showText value={current}
                onChange={(c) => onChange?.(c.toHexString().slice(0, 7).toUpperCase())} />
            <span style={{ display: "inline-flex", gap: 6 }}>
                {PRESETS.map((p) => (
                    <button key={p} type="button" aria-label={`Chọn màu ${p}`} onClick={() => onChange?.(p)}
                        style={{
                            width: 24, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: p, padding: 0,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12,
                            outline: current === p ? `2px solid ${p}` : "none", outlineOffset: 2,
                        }}>{current === p && <CheckOutlined />}</button>
                ))}
            </span>
        </div>
    );
}

/** Xem trước: nút, liên kết, thẻ với màu sẽ dùng thật, kèm tỉ lệ tương phản với chữ trắng. */
export function BrandPreview({ picked }: { picked?: string | null }) {
    const chosen = isHexColor(picked) ? picked.toUpperCase() : DEFAULT_BRAND;
    const used = ensureContrast(chosen);
    const ratio = contrastRatio(chosen, "#FFFFFF");
    const adjusted = used !== chosen;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: COLORS.fill, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Button type="primary">Nút chính</Button>
                <Button type="link" style={{ padding: 0 }}>Liên kết</Button>
                <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 10, background: COLORS.primarySoft, color: COLORS.primary }}>Thẻ trạng thái</span>
            </div>
            <span style={{ fontSize: 12, color: adjusted ? COLORS.warning : COLORS.textSecondary }}>
                {adjusted
                    ? `Màu ${chosen} hơi nhạt so với chữ trắng (tương phản ${ratio.toFixed(1)}:1, cần ${MIN_CONTRAST}:1). Hệ thống sẽ lưu bản đậm hơn ${used} để chữ dễ đọc.`
                    : `Tương phản với chữ trắng ${ratio.toFixed(1)}:1 — đạt yêu cầu ${MIN_CONTRAST}:1.`}
            </span>
        </div>
    );
}
