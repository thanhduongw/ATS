package iuh.fit.se.notification.event;

public record ApplicationCreatedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
,
        String jobTitle,
        /* Có khi ứng viên tự nộp — gửi thông báo "đã nhận hồ sơ" cho ứng viên. */
        Long candidateUserId
) {}