package iuh.fit.se.recruitment.requisition.dto;

import jakarta.validation.constraints.NotBlank;

public record JobRequisitionRejectRequest(
        @NotBlank(message = "Vui lòng nhập lý do từ chối") String reason
) {}