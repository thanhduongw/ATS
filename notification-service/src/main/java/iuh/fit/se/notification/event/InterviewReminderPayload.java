package iuh.fit.se.notification.event;

public record InterviewReminderPayload(Long tenantId, Long interviewId, Long applicationId) {}