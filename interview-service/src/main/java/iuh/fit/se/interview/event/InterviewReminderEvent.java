package iuh.fit.se.interview.event;

import java.time.LocalDateTime;

/** Mục 4.4: đến lúc nhắc lịch phỏng vấn. `hoursBefore` = 24 hoặc 1. notification-service gửi thông báo + email. */
public record InterviewReminderEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        int hoursBefore,
        String format,
        String meetingLink,
        Long workLocationId
) {}
