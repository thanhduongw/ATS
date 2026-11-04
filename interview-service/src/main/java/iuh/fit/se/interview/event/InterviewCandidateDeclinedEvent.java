package iuh.fit.se.interview.event;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ứng viên xin dời lịch phỏng vấn. Mang sẵn người cần báo (người phỏng vấn + HR phụ trách) để
 * notification-service không phải gọi ngược lại; HR phụ trách null → báo mọi Chuyên viên tuyển dụng.
 */
public record InterviewCandidateDeclinedEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName,
        String reason,
        List<Long> interviewerIds,
        Long assignedRecruiterId
) {}
