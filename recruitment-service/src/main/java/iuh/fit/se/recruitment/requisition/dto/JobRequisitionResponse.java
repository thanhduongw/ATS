package iuh.fit.se.recruitment.requisition.dto;

import iuh.fit.se.recruitment.requisition.RequisitionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record JobRequisitionResponse(
        Long id,
        String title,
        Long departmentId,
        Long jobTitleId,
        Long jobLevelId,
        Integer quantity,
        BigDecimal budget,
        BigDecimal expectedSalaryMin,
        BigDecimal expectedSalaryMax,
        LocalDate expectedStartDate,
        String description,
        Long requesterId,
        String requesterName,
        Long approverId,
        String approverName,
        RequisitionStatus status,
        String rejectReason,
        LocalDateTime createdAt
) {}