package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import iuh.fit.se.interview.interview.InterviewStatus;

import java.time.LocalDateTime;
import java.util.List;

public record InterviewResponse(
        Long id,
        Long applicationId,
        String candidateName,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        InterviewFormat format,
        String location,
        String meetingLink,
        String note,
        InterviewStatus status,
        boolean candidateConfirmed,
        List<InterviewerSummary> interviewers
) {}