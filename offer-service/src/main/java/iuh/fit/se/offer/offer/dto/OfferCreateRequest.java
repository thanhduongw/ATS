package iuh.fit.se.offer.offer.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record OfferCreateRequest(
        @NotNull(message = "Vui lòng chọn hồ sơ ứng tuyển") Long applicationId,
        @NotNull(message = "Vui lòng nhập mức lương") BigDecimal salaryOffered,
        @NotNull(message = "Vui lòng chọn loại hợp đồng") Long contractTypeId,
        @NotNull(message = "Vui lòng chọn ngày bắt đầu") LocalDate startDate,
        Integer probationMonths,
        LocalDateTime responseDeadline,
        String benefits,
        BigDecimal allowance,
        String note,
        @NotNull(message = "Vui lòng chọn người duyệt") Long approverId
) {}
