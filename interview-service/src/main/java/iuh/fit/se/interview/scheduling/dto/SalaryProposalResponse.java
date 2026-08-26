package iuh.fit.se.interview.scheduling.dto;

import iuh.fit.se.interview.scheduling.SalaryProposalStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SalaryProposalResponse(
        Long id,
        Long applicationId,
        Long interviewId,
        BigDecimal proposedSalary,
        String comment,
        Long proposedById,
        String proposedByName,
        SalaryProposalStatus status,
        LocalDateTime createdAt
) {}
