package iuh.fit.se.interview.scheduling.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record SalaryProposalRequest(
        @NotNull(message = "applicationId không được để trống")
        Long applicationId,
        Long interviewId,
        @NotNull(message = "Mức lương đề xuất không được để trống")
        @Positive(message = "Mức lương đề xuất phải lớn hơn 0")
        BigDecimal proposedSalary,
        String comment
) {}
