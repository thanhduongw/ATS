package iuh.fit.se.recruitment.requisition.dto;

import iuh.fit.se.recruitment.requisition.RequisitionPriority;
import iuh.fit.se.recruitment.requisition.RequisitionReason;
import iuh.fit.se.recruitment.requisition.WorkArrangement;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record JobRequisitionUpdateRequest(
        @NotBlank String title,
        @NotNull Long departmentId,
        @NotNull Long jobTitleId,
        Long jobLevelId,
        @NotNull @Positive Integer quantity,
        Long employmentTypeId,
        Long workLocationId,
        WorkArrangement workArrangement,
        String experienceRequired,
        RequisitionReason reason,
        RequisitionPriority priority,
        String note,
        BigDecimal budget,
        BigDecimal expectedSalaryMin,
        BigDecimal expectedSalaryMax,
        LocalDate expectedStartDate,
        String description,
        String requirements,
        String benefits,
        List<Long> skillIds,
        @NotNull Long approverId
) {}
