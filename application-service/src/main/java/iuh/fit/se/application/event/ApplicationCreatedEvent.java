package iuh.fit.se.application.event;

public record ApplicationCreatedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
,
        /* Tên vị trí ứng tuyển — để thông báo nói rõ đơn nào; null nếu không lấy được. */
        String jobTitle
) {}