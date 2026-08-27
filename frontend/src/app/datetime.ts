import type { Dayjs } from "dayjs";

/**
 * Backend nhận kiểu `LocalDateTime` — chuỗi KHÔNG kèm offset múi giờ.
 *
 * Nếu gửi `date.toISOString()` (giờ UTC, kết thúc bằng "Z") thì Jackson bỏ mất phần offset
 * và lưu thẳng giờ UTC làm giờ địa phương → lệch đúng bằng chênh lệch múi giờ
 * (Việt Nam UTC+7: chọn 15:00 nhưng lưu thành 08:00).
 *
 * Luôn dùng hàm này khi gửi một thời điểm lên backend.
 */
export const toLocalDateTimeString = (d: Dayjs) => d.format("YYYY-MM-DDTHH:mm:ss");
