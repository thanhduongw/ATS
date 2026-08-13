package iuh.fit.se.interview.event;

import java.time.LocalDateTime;

public record InterviewConfirmedEvent(
        Long tenantId,
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName
) {}