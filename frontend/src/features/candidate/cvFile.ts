/**
 * Tên file CV để hiện cho người dùng: lấy phần cuối đường dẫn S3 và bỏ mã ngẫu nhiên (UUID) mà
 * backend gắn trước tên gốc — "candidates/5/94a6e516-…-c2493a-Tran_Thi_Lan_CV.pdf" → "Tran_Thi_Lan_CV.pdf".
 */
export function cvFileName(url: string | null | undefined): string {
    if (!url) return "";
    const last = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "");
    return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
