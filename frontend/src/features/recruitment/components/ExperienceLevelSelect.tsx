import { useEffect, useState } from "react";
import { Select } from "antd";
import { getCatalogItems } from "../../masterdata/masterdataApi";

/**
 * Ô "Kinh nghiệm" chọn từ danh mục Mức kinh nghiệm (26/11/2026 — trước đây gõ tự do nên danh mục không dùng ở đâu).
 * Lưu TÊN mức vào trường chữ `experienceRequired` như cũ nên backend không đổi; giá trị cũ gõ tay vẫn hiện được.
 */
export default function ExperienceLevelSelect({ value, onChange, disabled }: {
    value?: string | null;
    onChange: (v: string | null) => void;
    disabled?: boolean;
}) {
    const [names, setNames] = useState<string[]>([]);

    useEffect(() => {
        getCatalogItems("/masterdata/experience-levels")
            .then((r) => setNames(r.data
                .filter((x) => x.active)
                .sort((a, b) => Number(a.minYears ?? 0) - Number(b.minYears ?? 0))
                .map((x) => String(x.name))))
            .catch(() => setNames([]));
    }, []);

    const options = names.map((n) => ({ value: n, label: n }));
    if (value && !names.includes(value)) options.unshift({ value, label: value });

    return (
        <Select
            allowClear
            disabled={disabled}
            placeholder="Chọn mức kinh nghiệm"
            value={value || undefined}
            onChange={(v) => onChange(v ?? null)}
            options={options}
        />
    );
}
