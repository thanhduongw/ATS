package iuh.fit.se.interview.event;

import java.time.LocalDateTime;
import java.util.List;

/**
 * HR huỷ một buổi phỏng vấn. Mang sẵn người cần báo để notification-service không phải gọi ngược lại:
 * mọi người phỏng vấn (trừ người huỷ) và ứng viên — chỉ khi ứng viên đã được báo lịch (phòng ban đã chốt giờ).
 */
public record InterviewCancelledEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName,
        List<Long> interviewerIds,
        Long actorUserId,
        boolean candidateNotified
) {}
