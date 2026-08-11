package iuh.fit.se.application.event;

public record ApplicationStatusChangedEvent(Long applicationId, Long jobPostingId, String fromStageName, String toStageName) {}
