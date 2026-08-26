package iuh.fit.se.application.event;

public record ApplicationStaleEvent(
        Long tenantId,
        Long applicationId,
        Long assignedRecruiterId,
        String candidateName,
        String currentStageName,
        long daysSinceUpdate
) {}
