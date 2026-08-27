import type { CSSProperties } from "react";
import { COLORS, RADIUS } from "../../app/theme";

/* ============================================================
   Hằng số style/cấu hình dùng chung cho trang danh sách.
   Tách khỏi pageKit.tsx (chỉ chứa component) để React Fast
   Refresh hoạt động đúng.
============================================================ */

/** Khung Card chuẩn cho vùng bảng chiếm hết chiều cao còn lại. */
export const listCardStyle: CSSProperties = {
    border: `1px solid ${COLORS.borderLight}`,
    borderRadius: RADIUS.lg,
    flex: 1,
    minHeight: 0,
};

export const listCardBodyStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
};

/** Cấu hình phân trang chuẩn cho bảng danh sách. */
export const listPagination = (totalLabel: string) => ({
    size: "small" as const,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    showTotal: (total: number) => `Tổng ${total} ${totalLabel}`,
});
