package iuh.fit.se.notification.event;

import java.time.LocalDateTime;
import java.util.List;

/**
 * HR huỷ buổi phỏng vấn (interview-service). Báo người phỏng vấn trừ người huỷ; báo ứng viên chỉ khi
 * {@code candidateNotified} — ứng viên đã được báo lịch (phòng ban đã chốt giờ) trước khi huỷ.
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
