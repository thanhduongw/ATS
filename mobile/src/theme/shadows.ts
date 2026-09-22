/**
 * Port từ `frontend/src/app/theme.ts` (SHADOWS), viết lại dạng chuỗi `boxShadow`.
 * React Native 0.76+ hiểu `boxShadow`; KHÔNG dùng shadowOffset/elevation kiểu cũ nữa.
 */
export const SHADOWS = {
  sm: "0px 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0px 4px 6px rgba(0, 0, 0, 0.07)",
  lg: "0px 10px 15px rgba(0, 0, 0, 0.08)",
  card: "0px 1px 3px rgba(0, 0, 0, 0.06)",
  dropdown: "0px 6px 16px rgba(0, 0, 0, 0.08)",
} as const;
