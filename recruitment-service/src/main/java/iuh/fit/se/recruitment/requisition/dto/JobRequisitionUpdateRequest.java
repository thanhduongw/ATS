package iuh.fit.se.recruitment.requisition.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JobRequisitionUpdateRequest(
        @NotBlank String title,
        @NotNull Long departmentId,
        @NotNull Long jobTitleId,
        Long jobLevelId,
        @NotNull @Positive Integer quantity,
        BigDecimal budget,
        BigDecimal expectedSalaryMin,
        BigDecimal expectedSalaryMax,
        LocalDate expectedStartDate,
        String description,
        @NotNull Long approverId
) {}