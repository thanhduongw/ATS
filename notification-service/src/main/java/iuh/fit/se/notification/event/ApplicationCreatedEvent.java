package iuh.fit.se.notification.event;

public record ApplicationCreatedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
) {}