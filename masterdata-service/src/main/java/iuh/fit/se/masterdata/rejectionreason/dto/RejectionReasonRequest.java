package iuh.fit.se.masterdata.rejectionreason.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectionReasonRequest(
        @NotBlank(message = "Lý do từ chối không được để trống") String name
) {}