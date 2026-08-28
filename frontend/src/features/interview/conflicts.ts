import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { InterviewResponse } from "./types";

export interface InterviewConflict {
    interviewId: number;
    interviewerNames: string[];
    candidateName: string;
    start: Dayjs;
    end: Dayjs;
}

/** Chỉ lịch còn hiệu lực mới tính là bận. */
const BLOCKING_STATUSES = new Set(["SCHEDULED", "CONFIRMED"]);

/**
 * Tìm các buổi phỏng vấn đã có của những người phỏng vấn được chọn bị chồng giờ
 * với khung giờ đang định đặt. Dùng để cảnh báo ngay trên form trước khi lưu.
 */
export function findInterviewerConflicts(
    interviews: InterviewResponse[],
    interviewerIds: number[],
    start: Dayjs | null,
    durationMinutes: number,
    excludeInterviewId?: number,
): InterviewConflict[] {
    if (!start || interviewerIds.length === 0 || durationMinutes <= 0) return [];

    const end = start.add(durationMinutes, "minute");
    const wanted = new Set(interviewerIds);

    return interviews
        .filter((iv) => iv.id !== excludeInterviewId && BLOCKING_STATUSES.has(iv.status))
        .map((iv) => {
            const ivStart = dayjs(iv.scheduledAt);
            const ivEnd = ivStart.add(iv.durationMinutes ?? 60, "minute");
            const overlapping = iv.interviewers.filter((p) => wanted.has(p.interviewerId));
            return { iv, ivStart, ivEnd, overlapping };
        })
        .filter(
            ({ ivStart, ivEnd, overlapping }) =>
                overlapping.length > 0 && start.isBefore(ivEnd) && end.isAfter(ivStart),
        )
        .map(({ iv, ivStart, ivEnd, overlapping }) => ({
            interviewId: iv.id,
            interviewerNames: overlapping.map((p) => p.fullName),
            candidateName: iv.candidateName,
            start: ivStart,
            end: ivEnd,
        }));
}

/** Mô tả ngắn gọn xung đột để hiện trong Alert. */
export function describeConflict(c: InterviewConflict) {
    return `${c.interviewerNames.join(", ")} đang phỏng vấn ${c.candidateName} lúc ${c.start.format(
        "HH:mm",
    )}–${c.end.format("HH:mm")} ngày ${c.start.format("DD/MM/YYYY")}`;
}
