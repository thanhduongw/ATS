package iuh.fit.se.notification.event;

import java.time.LocalDateTime;

public record InterviewReminderPayload(
        Long interviewId,
        Long applicationId,
        LocalDateTime expectedScheduledAt
) {}
