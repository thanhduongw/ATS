package iuh.fit.se.masterdata.employmenttype.dto;

import jakarta.validation.constraints.NotBlank;

public record EmploymentTypeRequest(
        @NotBlank(message = "Tên loại hình làm việc không được để trống") String name
) {}