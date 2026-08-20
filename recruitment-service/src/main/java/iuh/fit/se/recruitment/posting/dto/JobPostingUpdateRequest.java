package iuh.fit.se.recruitment.posting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record JobPostingUpdateRequest(
        @NotBlank(message = "Tiêu đề không được để trống") String title,
        @NotNull(message = "Vui lòng chọn loại hình làm việc") Long employmentTypeId,
        @NotNull(message = "Vui lòng chọn địa điểm làm việc") Long workLocationId,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String description,
        String requirements,
        String benefits,
        List<Long> skillIds
) {}