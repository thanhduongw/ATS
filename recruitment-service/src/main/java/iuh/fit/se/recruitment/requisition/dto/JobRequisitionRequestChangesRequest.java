package iuh.fit.se.recruitment.requisition.dto;

import jakarta.validation.constraints.NotBlank;

public record JobRequisitionRequestChangesRequest(
        @NotBlank(message = "Vui lòng nhập nội dung cần chỉnh sửa") String note
) {}
