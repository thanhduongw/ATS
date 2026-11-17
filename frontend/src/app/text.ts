/**
 * Tìm kiếm không phân biệt dấu và hoa thường: gõ "nguyen" vẫn ra "Nguyễn", "da nang" ra "Đà Nẵng".
 * Dùng chung cho mọi ô lọc phía giao diện (Ctrl+K, danh sách, danh mục, việc làm công khai).
 */
export function foldText(value: unknown): string {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

/** `keyword` rỗng thì luôn khớp. Mọi từ trong `keyword` phải xuất hiện ở ít nhất một trường. */
export function matchesKeyword(keyword: string, ...fields: unknown[]): boolean {
    const k = foldText(keyword);
    if (!k) return true;
    const hay = fields.map(foldText).join(" ");
    return k.split(/\s+/).every((word) => hay.includes(word));
}

/** Cho `filterOption` của antd Select: lọc theo nhãn, không phân biệt dấu. */
export function filterOptionByLabel(input: string, option?: { label?: unknown } | null): boolean {
    return matchesKeyword(input, option?.label);
}
