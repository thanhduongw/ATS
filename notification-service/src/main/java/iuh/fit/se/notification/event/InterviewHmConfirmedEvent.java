package iuh.fit.se.notification.event;

import java.time.LocalDateTime;

/** Phòng ban đã chốt giờ — mốc duy nhất được phép thông báo lịch cho ứng viên. */
public record InterviewHmConfirmedEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName
) {}
