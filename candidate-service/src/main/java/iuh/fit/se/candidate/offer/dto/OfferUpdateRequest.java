package iuh.fit.se.candidate.offer.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OfferUpdateRequest(
        @NotNull @Positive BigDecimal salaryOffered,
        @NotNull Long contractTypeId,
        @NotNull LocalDate startDate,
        Integer probationMonths,
        String benefits,
        BigDecimal allowance,
        String note,
        @NotNull Long approverId
) {}