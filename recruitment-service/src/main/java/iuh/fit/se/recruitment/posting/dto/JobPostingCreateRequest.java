package iuh.fit.se.recruitment.posting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JobPostingCreateRequest(
        @NotNull(message = "Vui lòng chọn yêu cầu tuyển dụng") Long requisitionId,
        @NotBlank(message = "Tiêu đề không được để trống") String title,
        @NotNull(message = "Vui lòng chọn loại hình làm việc") Long employmentTypeId,
        @NotNull(message = "Vui lòng chọn địa điểm làm việc") Long workLocationId,
        @NotNull(message = "Vui lòng chọn quy trình tuyển dụng") Long pipelineId,
        String description,
        String requirements,
        String benefits
) {}