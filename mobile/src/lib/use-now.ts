import { useEffect, useState } from "react";

/**
 * "Bây giờ" (ms) dùng trong render, cập nhật mỗi phút. Gọi thẳng `Date.now()` lúc render là
 * hàm không thuần (lint react-hooks/purity): mỗi lần vẽ lại cho kết quả khác nhau.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
