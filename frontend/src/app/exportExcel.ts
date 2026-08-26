import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export interface ExportColumn<T> {
    header: string;
    /** Lấy giá trị hiển thị cho ô Excel từ 1 dòng dữ liệu. */
    value: (row: T) => string | number | null | undefined;
}

/** Xuất dữ liệu đang hiển thị (đã lọc/hiện tại) ra file .xlsx, tải về ngay trên trình duyệt. */
export function exportToExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
    const data = rows.map((row) => {
        const record: Record<string, string | number> = {};
        columns.forEach((col) => {
            const v = col.value(row);
            record[col.header] = v ?? "";
        });
        return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
