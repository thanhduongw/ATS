package iuh.fit.se.candidate.offer.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OfferCreateRequest(
        @NotNull(message = "Vui lòng chọn hồ sơ ứng tuyển") Long applicationId,
        @NotNull @Positive(message = "Mức lương phải lớn hơn 0") BigDecimal salaryOffered,
        @NotNull(message = "Vui lòng chọn loại hợp đồng") Long contractTypeId,
        @NotNull(message = "Vui lòng chọn ngày bắt đầu") LocalDate startDate,
        Integer probationMonths,
        String benefits,
        BigDecimal allowance,
        String note,
        @NotNull(message = "Vui lòng chọn người phê duyệt") Long approverId
) {}