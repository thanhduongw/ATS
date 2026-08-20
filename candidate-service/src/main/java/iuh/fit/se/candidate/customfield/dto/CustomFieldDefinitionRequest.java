package iuh.fit.se.candidate.customfield.dto;

import iuh.fit.se.candidate.customfield.CustomFieldType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CustomFieldDefinitionRequest(
        @NotBlank(message = "Khóa trường không được để trống") String fieldKey,
        @NotBlank(message = "Nhãn hiển thị không được để trống") String fieldLabel,
        @NotNull(message = "Vui lòng chọn kiểu dữ liệu") CustomFieldType fieldType
) {}
