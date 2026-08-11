package iuh.fit.se.notification.event;

public record ApplicationStatusChangedEvent(Long applicationId, Long jobPostingId, String fromStageName, String toStageName) {}
