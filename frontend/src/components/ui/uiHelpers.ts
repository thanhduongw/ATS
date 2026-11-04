/** Chữ cái đầu cho ảnh đại diện (DS03): hai chữ cuối của họ tên tiếng Việt. */
export function initialsOf(name?: string | null): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

