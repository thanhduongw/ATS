package iuh.fit.se.interview.interview.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import iuh.fit.se.interview.interview.InterviewStatus;

import java.time.LocalDateTime;
import java.util.List;

public record CandidateInterviewResponse(
        Long id,
        Long applicationId,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        InterviewStatus status,
        boolean candidateConfirmed,
        List<String> interviewerNames
) {}
