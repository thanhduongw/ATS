package iuh.fit.se.candidate.offer.dto;

import jakarta.validation.constraints.NotNull;

public record OfferDeclineRequest(
        @NotNull(message = "Vui lòng chọn lý do ứng viên từ chối") Long declineReasonId,
        String note
) {}