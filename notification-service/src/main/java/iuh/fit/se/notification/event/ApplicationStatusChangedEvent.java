package iuh.fit.se.notification.event;

public record ApplicationStatusChangedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long candidateUserId,
        Long assignedRecruiterId,
        String fromStageName,
        String toStageName,
        String toStageType,
        /* WITHDRAWN | HIRED_ELSEWHERE | DATA_DELETED khi đơn đóng không phải do công ty từ chối. */
        String closedReason,
        String jobTitle
) {}