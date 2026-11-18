package iuh.fit.se.application.event;

public record ApplicationStatusChangedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long candidateUserId,
        Long assignedRecruiterId,
        String fromStageName,
        String toStageName,
        String toStageType,
        /* WITHDRAWN | HIRED_ELSEWHERE | DATA_DELETED khi đơn đóng không phải do công ty từ chối; null trong các trường hợp khác. */
        String closedReason,
        /* Tên vị trí ứng tuyển — để thông báo nói rõ đơn nào; null nếu không lấy được. */
        String jobTitle
) {}