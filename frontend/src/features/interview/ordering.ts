import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { INTERVIEW_CLOSED, type InterviewResponse, type InterviewStatus } from "./types";
import { INTERVIEW_STATUS_ORDER } from "../../app/statusLabels";

/** Sắp trạng thái theo dòng chảy nghiệp vụ, không theo bảng chữ cái. */
export function statusRank(status: InterviewStatus): number {
    const index = (INTERVIEW_STATUS_ORDER as readonly string[]).indexOf(status);
    return index === -1 ? INTERVIEW_STATUS_ORDER.length : index;
}

/** Buổi chưa khép lại mà đã qua giờ kết thúc — đang tắc ở đâu đó. */
export function isOverdue(interview: InterviewResponse, now: Dayjs = dayjs()): boolean {
    if (INTERVIEW_CLOSED.has(interview.status)) return false;
    return dayjs(interview.scheduledAt)
        .add(interview.durationMinutes ?? 60, "minute")
        .isBefore(now);
}

/**
 * Xếp hạng ưu tiên cho thứ tự mặc định của danh sách:
 *
 *   0 — quá hạn: đã qua giờ mà chưa khép lại, đây là chỗ HR phải xử lý trước
 *   1 — sắp tới
 *   2 — đã kết thúc: hoàn thành, vắng mặt, đã hủy
 */
export function urgencyRank(interview: InterviewResponse, now: Dayjs = dayjs()): number {
    if (INTERVIEW_CLOSED.has(interview.status)) return 2;
    return isOverdue(interview, now) ? 0 : 1;
}

/**
 * Thứ tự mặc định của chế độ Danh sách: việc cần làm nổi lên trên, việc đã xong
 * chìm xuống dưới. Trong cùng một nhóm mới xếp theo giờ.
 */
export function sortInterviewsForList(
    interviews: InterviewResponse[],
    now: Dayjs = dayjs(),
): InterviewResponse[] {
    return [...interviews].sort((a, b) => {
        const rankA = urgencyRank(a, now);
        const rankB = urgencyRank(b, now);
        if (rankA !== rankB) return rankA - rankB;

        const timeA = dayjs(a.scheduledAt).valueOf();
        const timeB = dayjs(b.scheduledAt).valueOf();
        // Nhóm đã kết thúc: buổi gần đây có ích hơn buổi từ lâu.
        // Hai nhóm còn lại: quá hạn lâu nhất và sắp diễn ra sớm nhất phải lên trước.
        return rankA === 2 ? timeB - timeA : timeA - timeB;
    });
}
