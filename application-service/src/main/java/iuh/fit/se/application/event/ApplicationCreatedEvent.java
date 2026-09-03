package iuh.fit.se.application.event;

public record ApplicationCreatedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
) {}