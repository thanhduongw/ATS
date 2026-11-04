package iuh.fit.se.interview.event;

/** Bản sao sự kiện "application.status_changed" của application-service (chỉ các trường cần dùng). */
public record ApplicationStatusChangedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long candidateUserId,
        Long assignedRecruiterId,
        String fromStageName,
        String toStageName,
        String toStageType
) {}
