package iuh.fit.se.notification.event;

import java.time.LocalDateTime;

public record InterviewConfirmedEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName
) {}