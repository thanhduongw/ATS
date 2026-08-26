package iuh.fit.se.interview.scheduling.dto;

import iuh.fit.se.interview.interview.InterviewFormat;
import iuh.fit.se.interview.scheduling.InterviewSlotStatus;

import java.time.LocalDateTime;

public record InterviewSlotResponse(
        Long id,
        Long applicationId,
        String candidateName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        InterviewFormat format,
        String location,
        String meetingLink,
        InterviewSlotStatus status,
        boolean departmentConfirmed,
        boolean candidateConfirmed,
        boolean matched
) {}
