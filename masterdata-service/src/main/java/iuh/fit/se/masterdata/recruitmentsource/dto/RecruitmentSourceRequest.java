package iuh.fit.se.masterdata.recruitmentsource.dto;

import jakarta.validation.constraints.NotBlank;

public record RecruitmentSourceRequest(
        @NotBlank(message = "Tên nguồn tuyển dụng không được để trống") String name
) {}