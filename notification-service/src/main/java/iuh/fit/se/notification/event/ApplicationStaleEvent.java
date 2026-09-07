package iuh.fit.se.notification.event;

public record ApplicationStaleEvent(
        Long applicationId,
        Long assignedRecruiterId,
        String candidateName,
        String currentStageName,
        long daysSinceUpdate
) {}
