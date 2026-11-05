package iuh.fit.se.notification.event;

import java.time.LocalDateTime;
import java.util.List;

/** Khớp interview-service: ứng viên xin dời lịch phỏng vấn (kèm lý do). */
public record InterviewCandidateDeclinedEvent(
        Long interviewId,
        Long applicationId,
        LocalDateTime scheduledAt,
        String candidateName,
        String reason,
        List<Long> interviewerIds,
        Long assignedRecruiterId
) {}
