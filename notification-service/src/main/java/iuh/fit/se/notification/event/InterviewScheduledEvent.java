package iuh.fit.se.notification.event;

import java.time.LocalDateTime;

public record InterviewScheduledEvent(Long tenantId, Long interviewId, Long applicationId, LocalDateTime scheduledAt) {}