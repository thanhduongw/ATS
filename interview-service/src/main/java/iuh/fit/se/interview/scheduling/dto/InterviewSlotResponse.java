package iuh.fit.se.interview.scheduling.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import iuh.fit.se.interview.scheduling.InterviewSlotStatus;

import java.time.LocalDateTime;
import java.util.List;

public record InterviewSlotResponse(
        Long id,
        Long applicationId,
        String candidateName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        InterviewFormat format,
        Long workLocationId,
        String meetingLink,
        InterviewSlotStatus status,
        boolean departmentConfirmed,
        boolean candidateConfirmed,
        boolean matched,
        List<Long> interviewerIds,
        String note,
        LocalDateTime responseDeadline
) {}
