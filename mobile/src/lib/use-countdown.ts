import { useEffect, useState } from "react";

/**
 * Đếm ngược theo giây, dùng để chặn bấm "Gửi lại mã" liên tục (màn xác minh email và
 * màn đặt lại mật khẩu). `restart()` đặt lại từ đầu sau khi gửi lại thành công.
 */
export function useCountdown(from: number) {
  const [seconds, setSeconds] = useState(from);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return { seconds, restart: () => setSeconds(from) };
}
