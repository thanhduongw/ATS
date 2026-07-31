package iuh.fit.se.candidate.application.dto;

import jakarta.validation.constraints.NotNull;

public record ApplicationRejectRequest(
        @NotNull(message = "Vui lòng chọn lý do từ chối") Long rejectionReasonId,
        String note
) {}