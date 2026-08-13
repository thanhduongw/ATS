package iuh.fit.se.notification.event;

public record ApplicationStatusChangedEvent(
        Long tenantId,
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long candidateUserId,
        Long assignedRecruiterId,
        String fromStageName,
        String toStageName,
        String toStageType
) {}