package iuh.fit.se.recruitment.posting.dto;

import iuh.fit.se.recruitment.requisition.WorkArrangement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record JobPostingCreateRequest(
        @NotNull(message = "Vui lòng chọn yêu cầu tuyển dụng") Long requisitionId,
        @NotBlank(message = "Tiêu đề không được để trống") String title,
        @NotNull(message = "Vui lòng chọn loại hình làm việc") Long employmentTypeId,
        @NotNull(message = "Vui lòng chọn địa điểm làm việc") Long workLocationId,
        WorkArrangement workArrangement,
        String experienceRequired,
        @NotNull(message = "Vui lòng chọn quy trình tuyển dụng") Long pipelineId,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String description,
        String requirements,
        String benefits,
        List<Long> skillIds
) {}
