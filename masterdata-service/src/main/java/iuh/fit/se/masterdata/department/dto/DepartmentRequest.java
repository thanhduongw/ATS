package iuh.fit.se.masterdata.department.dto;

import jakarta.validation.constraints.NotBlank;

public record DepartmentRequest(
        @NotBlank(message = "Tên phòng ban không được để trống") String name,
        String description
) {}