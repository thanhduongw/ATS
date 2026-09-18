package iuh.fit.se.notification.event;

import java.time.LocalDateTime;

public record EvaluationCheckPayload(Long interviewId, LocalDateTime expectedScheduledAt) {}
