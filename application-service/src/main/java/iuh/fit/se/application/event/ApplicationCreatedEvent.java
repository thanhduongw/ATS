package iuh.fit.se.application.event;

public record ApplicationCreatedEvent(
        Long tenantId,
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
) {}