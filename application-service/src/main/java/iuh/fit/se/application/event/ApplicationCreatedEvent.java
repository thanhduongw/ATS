package iuh.fit.se.application.event;

public record ApplicationCreatedEvent(
        Long applicationId,
        Long jobPostingId,
        Long candidateId,
        Long assignedRecruiterId,
        String candidateName
,
        /* Tên vị trí ứng tuyển — để thông báo nói rõ đơn nào; null nếu không lấy được. */
        String jobTitle,
        /* Tài khoản của ứng viên khi ứng viên TỰ nộp (để báo "đã nhận hồ sơ"); null khi HR thêm hồ sơ. */
        Long candidateUserId
) {}