package iuh.fit.se.candidate.event;

public record ApplicationStatusChangedEvent(
        Long applicationId, Long jobPostingId, String fromStageName, String toStageName
) {}