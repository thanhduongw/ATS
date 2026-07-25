package iuh.fit.se.recruitment.requisition.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JobRequisitionCreateRequest(
        @NotBlank(message = "Tiêu đề không được để trống") String title,
        @NotNull(message = "Vui lòng chọn phòng ban") Long departmentId,
        @NotNull(message = "Vui lòng chọn chức vụ") Long jobTitleId,
        Long jobLevelId,
        @NotNull @Positive(message = "Số lượng phải lớn hơn 0") Integer quantity,
        BigDecimal budget,
        BigDecimal expectedSalaryMin,
        BigDecimal expectedSalaryMax,
        LocalDate expectedStartDate,
        String description,
        @NotNull(message = "Vui lòng chọn người phê duyệt") Long approverId
) {}