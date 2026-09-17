import dayjs, { type Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/**
 * Hạn nộp đánh giá tính từ thời điểm phỏng vấn. Con số này phải khớp với
 * `app.notification.evaluation-check-hours-after` của notification-service — đó là lúc
 * hệ thống kiểm tra và gửi thông báo nhắc người chưa nộp.
 */
export const EVALUATION_DUE_HOURS = 24;

export const evaluationDueAt = (scheduledAt: string): Dayjs =>
    dayjs(scheduledAt).add(EVALUATION_DUE_HOURS, "hour");
