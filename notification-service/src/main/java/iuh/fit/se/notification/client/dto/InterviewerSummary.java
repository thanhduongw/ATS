package iuh.fit.se.notification.client.dto;

public record InterviewerSummary(
        Long interviewerId,
        String fullName,
        boolean evaluationSubmitted
) {}