package iuh.fit.se.recruitment.requisition.dto;

import iuh.fit.se.recruitment.requisition.RequisitionPriority;
import iuh.fit.se.recruitment.requisition.RequisitionReason;
import iuh.fit.se.recruitment.requisition.WorkArrangement;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record JobRequisitionCreateRequest(
        @NotBlank(message = "Tiêu đề không được để trống") String title,
        @NotNull(message = "Vui lòng chọn phòng ban") Long departmentId,
        @NotNull(message = "Vui lòng chọn chức vụ") Long jobTitleId,
        Long jobLevelId,
        @NotNull @Positive(message = "Số lượng phải lớn hơn 0") Integer quantity,
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
        @NotNull(message = "Vui lòng chọn người phê duyệt") Long approverId
) {}
