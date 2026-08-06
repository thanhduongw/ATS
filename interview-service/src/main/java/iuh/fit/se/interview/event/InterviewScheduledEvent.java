package iuh.fit.se.interview.event;

import java.time.LocalDateTime;

public record InterviewScheduledEvent(Long tenantId, Long interviewId, Long applicationId, LocalDateTime scheduledAt) {}