package iuh.fit.se.interview.event;

import java.time.LocalDateTime;

/**
 * HM đã chốt giờ phỏng vấn. Đây là mốc duy nhất được phép thông báo cho ứng viên —
 * trước đó (SCHEDULED, HM_RESCHEDULE_PROPOSED) ứng viên không được biết lịch tồn tại.
 */
public record InterviewHmConfirmedEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName
) {}
