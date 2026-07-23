package iuh.fit.se.masterdata.educationlevel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EducationLevelRequest(
        @NotBlank(message = "Tên trình độ học vấn không được để trống") String name,
        @NotNull(message = "Thứ tự không được để trống") Integer orderNo
) {}